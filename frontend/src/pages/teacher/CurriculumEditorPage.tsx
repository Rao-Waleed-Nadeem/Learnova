import React, { useState, useEffect } from 'react';
import {
  Layers,
  Plus,
  ChevronRight,
  ChevronDown,
  BookOpen,
  FileText,
  Save,
  Trash2,
  GitBranch,
  ArrowUp,
  ArrowDown,
  ExternalLink,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  CheckSquare,
  ClipboardList,
  UploadCloud,
  X,
  Search,
  Eye,
  Edit3,
} from 'lucide-react';
import { PageHeader } from '../../components/ui/PageHeader';
import { Button } from '../../components/ui/Button';
import { FormField } from '../../components/ui/FormField';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { RichMarkdownRenderer } from '../../components/common/RichMarkdownRenderer';
import { Course, Topic, Lesson, LearningResource, Assessment, ResourceType } from '../../types';

interface CurriculumEditorPageProps {
  course: Course;
  topics: Topic[];
  lessons: Lesson[];
  resources: LearningResource[];
  assessments?: Assessment[];
  onNavigate: (page: string, params?: Record<string, string>) => void;
  onSaveTopic: (topic: Topic) => Promise<Topic | void> | void;
  onDeleteTopic: (id: string) => void;
  onSaveLesson: (lesson: Lesson) => Promise<Lesson | void> | void;
  onDeleteLesson: (id: string) => void;
  onSaveAssessment?: (assessment: Assessment) => void;
  onSaveResource?: (resource: LearningResource) => void;
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

export const CurriculumEditorPage: React.FC<CurriculumEditorPageProps> = ({
  course,
  topics,
  lessons,
  resources,
  assessments = [],
  onNavigate,
  onSaveTopic,
  onDeleteTopic,
  onSaveLesson,
  onDeleteLesson,
  onSaveAssessment,
  onSaveResource,
  onNotify,
}) => {
  // Sort topics by order
  const sortedTopics = [...topics].sort((a, b) => a.order - b.order);

  // Selection state
  const [selectedType, setSelectedType] = useState<'topic' | 'lesson' | null>(
    sortedTopics.length > 0 ? 'topic' : null
  );
  const [selectedId, setSelectedId] = useState<string>(
    sortedTopics.length > 0 ? sortedTopics[0].id : ''
  );

  // Expanded topics state
  const [expandedTopics, setExpandedTopics] = useState<Record<string, boolean>>(() => {
    const init: Record<string, boolean> = {};
    sortedTopics.forEach((t) => {
      init[t.id] = true;
    });
    return init;
  });

  // Editor form values
  const currentTopic = sortedTopics.find((t) => t.id === selectedId);
  const currentLesson = lessons.find((l) => l.id === selectedId);

  const [topicTitle, setTopicTitle] = useState(currentTopic?.title || '');
  const [topicDesc, setTopicDesc] = useState(currentTopic?.description || '');
  const [topicThreshold, setTopicThreshold] = useState(currentTopic?.masteryThreshold || 75);

  const [lessonTitle, setLessonTitle] = useState(currentLesson?.title || '');
  const [lessonDesc, setLessonDesc] = useState(currentLesson?.description || '');
  const [lessonOrder, setLessonOrder] = useState<number>(currentLesson?.order || 1);
  const [lessonDescPreview, setLessonDescPreview] = useState(false);

  // Add Lesson Modal state
  const [addLessonTopic, setAddLessonTopic] = useState<Topic | null>(null);
  const [newLessonTitle, setNewLessonTitle] = useState('');
  const [newLessonOrder, setNewLessonOrder] = useState<number>(1);
  const [newLessonDesc, setNewLessonDesc] = useState('');
  const [isSubmittingNewLesson, setIsSubmittingNewLesson] = useState(false);

  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // Synchronize selection if selectedId becomes stale (e.g. temporary ID replaced by real UUID from backend)
  useEffect(() => {
    if (selectedType === 'topic') {
      const found = sortedTopics.find((t) => t.id === selectedId);
      if (!found && sortedTopics.length > 0) {
        const matched =
          sortedTopics.find((t) => t.title === topicTitle) ||
          sortedTopics[sortedTopics.length - 1];
        if (matched) {
          setSelectedId(matched.id);
          setTopicTitle(matched.title);
          setTopicDesc(matched.description);
          setTopicThreshold(matched.masteryThreshold || 75);
          setExpandedTopics((prev) => ({ ...prev, [matched.id]: true }));
        }
      }
    }
  }, [topics, selectedType, selectedId]);

  // Deletion modals
  const [confirmDeleteTopic, setConfirmDeleteTopic] = useState<Topic | null>(null);
  const [confirmDeleteLesson, setConfirmDeleteLesson] = useState<Lesson | null>(null);

  // Assessment Slide-over Picker Drawer state
  const [isAssessmentDrawerOpen, setIsAssessmentDrawerOpen] = useState(false);
  const [drawerTopic, setDrawerTopic] = useState<Topic | null>(null);
  const [assessmentDrawerSearch, setAssessmentDrawerSearch] = useState('');

  // Multi-File Upload from PC Modal state
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [uploadTargetLesson, setUploadTargetLesson] = useState<Lesson | null>(null);
  const [stagedFiles, setStagedFiles] = useState<File[]>([]);
  const [uploadError, setUploadError] = useState<string | null>(null);

  // Handlers for Assessment Picker Drawer
  const handleOpenAssessmentDrawer = (t: Topic) => {
    setDrawerTopic(t);
    setAssessmentDrawerSearch('');
    setIsAssessmentDrawerOpen(true);
  };

  const handleAttachAssessment = (assessment: Assessment, targetTopic: Topic) => {
    if (!onSaveAssessment) {
      onNotify('error', 'Unable to save assessment assignment.');
      return;
    }
    const updated: Assessment = {
      ...assessment,
      topicId: targetTopic.id,
      updatedAt: new Date().toISOString(),
    };
    onSaveAssessment(updated);
    onNotify('success', `Assessment "${assessment.title}" attached to topic "${targetTopic.title}".`);
    setIsAssessmentDrawerOpen(false);
  };

  // Handlers for PC File Upload Modal
  const handleOpenUploadModal = (l: Lesson) => {
    setUploadTargetLesson(l);
    setStagedFiles([]);
    setUploadError(null);
    setIsUploadModalOpen(true);
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

    // Reset input so re-selecting same file triggers onChange
    e.target.value = '';
  };

  const handleRemoveStagedFile = (idx: number) => {
    setStagedFiles((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleUploadStagedFiles = () => {
    if (!uploadTargetLesson || stagedFiles.length === 0) return;
    if (!onSaveResource) {
      onNotify('error', 'Unable to save learning resources.');
      return;
    }

    stagedFiles.forEach((file, index) => {
      const ext = getFileExtension(file.name);
      const resType: ResourceType = ext === '.md' ? 'markdown' : 'document';
      const cleanTitle = file.name.replace(/\.[^/.]+$/, '');
      const newResource: LearningResource = {
        id: `res-${Date.now()}-${index}-${Math.random().toString(36).substring(2, 6)}`,
        courseId: course.id,
        lessonId: uploadTargetLesson.id,
        title: cleanTitle,
        type: resType,
        contentOrUrl: `local-file://${file.name}`,
        fileSize: `${formatFileSize(file.size)} (${ext.toUpperCase().replace('.', '')})`,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      onSaveResource(newResource);
    });

    onNotify('success', `${stagedFiles.length} resource(s) successfully attached to "${uploadTargetLesson.title}".`);
    setStagedFiles([]);
    setIsUploadModalOpen(false);
  };

  // Sync form when selection changes
  const selectTopicNode = (t: Topic) => {
    if (hasUnsavedChanges) {
      if (!confirm('You have unsaved edits in this editor. Switch anyway?')) return;
    }
    setSelectedType('topic');
    setSelectedId(t.id);
    setTopicTitle(t.title);
    setTopicDesc(t.description);
    setTopicThreshold(t.masteryThreshold || 75);
    setHasUnsavedChanges(false);
  };

  const selectLessonNode = (l: Lesson) => {
    if (hasUnsavedChanges) {
      if (!confirm('You have unsaved edits in this editor. Switch anyway?')) return;
    }
    setSelectedType('lesson');
    setSelectedId(l.id);
    setLessonTitle(l.title);
    setLessonDesc(l.description);
    setLessonOrder(l.order || 1);
    setLessonDescPreview(false);
    setHasUnsavedChanges(false);
  };

  const toggleExpand = (topicId: string) => {
    setExpandedTopics((prev) => ({ ...prev, [topicId]: !prev[topicId] }));
  };

  // Add Topic
  const handleAddTopic = async () => {
    const tempId = `topic-${Date.now()}`;
    const newTopic: Topic = {
      id: tempId,
      courseId: course.id,
      title: `Topic ${sortedTopics.length + 1}: New Curriculum Unit`,
      description: 'Topic syllabus summary and objectives.',
      order: sortedTopics.length + 1,
      prerequisiteTopicIds: [],
      masteryThreshold: 75,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    setSelectedType('topic');
    setSelectedId(tempId);
    setTopicTitle(newTopic.title);
    setTopicDesc(newTopic.description);
    setTopicThreshold(newTopic.masteryThreshold);
    setExpandedTopics((prev) => ({ ...prev, [tempId]: true }));

    try {
      const saved = await onSaveTopic(newTopic);
      if (saved && (saved as Topic).id) {
        const realId = (saved as Topic).id;
        setSelectedId(realId);
        setExpandedTopics((prev) => ({ ...prev, [realId]: true }));
      }
      onNotify('success', 'New topic created.');
    } catch {
      // Error notifications handled by onSaveTopic
    }
  };

  // Add Lesson modal open
  const handleOpenAddLessonModal = (targetTopicId: string) => {
    const target = sortedTopics.find((t) => t.id === targetTopicId) || topics.find((t) => t.id === targetTopicId);
    if (!target) return;
    const topicLessons = lessons.filter((l) => l.topicId === targetTopicId);
    const nextOrder = topicLessons.length + 1;
    setAddLessonTopic(target);
    setNewLessonTitle(`Lesson ${nextOrder}: `);
    setNewLessonOrder(nextOrder);
    setNewLessonDesc('');
  };

  const handleAddLesson = handleOpenAddLessonModal;

  const handleCreateLessonSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!addLessonTopic) return;
    if (!newLessonTitle.trim()) {
      onNotify('error', 'Lesson title cannot be empty.');
      return;
    }

    setIsSubmittingNewLesson(true);
    const tempId = `lesson-${Date.now()}`;
    const newLesson: Lesson = {
      id: tempId,
      topicId: addLessonTopic.id,
      courseId: course.id,
      title: newLessonTitle.trim(),
      description: newLessonDesc.trim(),
      order: Number(newLessonOrder) || 1,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    setExpandedTopics((prev) => ({ ...prev, [addLessonTopic.id]: true }));

    try {
      const saved = await onSaveLesson(newLesson);
      const effectiveId = saved && (saved as Lesson).id ? (saved as Lesson).id : tempId;
      setSelectedType('lesson');
      setSelectedId(effectiveId);
      setLessonTitle(newLesson.title);
      setLessonDesc(newLesson.description);
      setLessonOrder(newLesson.order);
      setHasUnsavedChanges(false);
      setAddLessonTopic(null);
      onNotify('success', 'New lesson created successfully.');
    } catch (err: any) {
      onNotify('error', err?.message || 'Failed to create lesson.');
    } finally {
      setIsSubmittingNewLesson(false);
    }
  };

  // Move topic order
  const handleMoveTopic = (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= sortedTopics.length) return;

    const topicA = sortedTopics[index];
    const topicB = sortedTopics[targetIndex];

    const updatedA = { ...topicA, order: topicB.order };
    const updatedB = { ...topicB, order: topicA.order };

    onSaveTopic(updatedA);
    onSaveTopic(updatedB);
    onNotify('info', 'Topic sequence updated.');
  };

  // Save changes
  const handleSaveTopicChanges = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentTopic) return;
    if (!topicTitle.trim()) {
      onNotify('error', 'Topic title cannot be empty.');
      return;
    }
    const updated: Topic = {
      ...currentTopic,
      title: topicTitle.trim(),
      description: topicDesc.trim(),
      masteryThreshold: Number(topicThreshold) || 75,
      updatedAt: new Date().toISOString(),
    };
    onSaveTopic(updated);
    setHasUnsavedChanges(false);
    onNotify('success', 'Topic changes saved.');
  };

  const handleSaveLessonChanges = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentLesson) return;
    if (!lessonTitle.trim()) {
      onNotify('error', 'Lesson title cannot be empty.');
      return;
    }
    const updated: Lesson = {
      ...currentLesson,
      title: lessonTitle.trim(),
      description: lessonDesc.trim(),
      order: Number(lessonOrder) || currentLesson.order,
      updatedAt: new Date().toISOString(),
    };
    onSaveLesson(updated);
    setHasUnsavedChanges(false);
    onNotify('success', 'Lesson changes saved.');
  };

  const handleDeleteTopicConfirm = () => {
    if (confirmDeleteTopic) {
      onDeleteTopic(confirmDeleteTopic.id);
      setConfirmDeleteTopic(null);
      if (selectedId === confirmDeleteTopic.id) {
        setSelectedType(null);
        setSelectedId('');
      }
      onNotify('info', 'Topic removed from curriculum.');
    }
  };

  const handleDeleteLessonConfirm = () => {
    if (confirmDeleteLesson) {
      onDeleteLesson(confirmDeleteLesson.id);
      setConfirmDeleteLesson(null);
      if (selectedId === confirmDeleteLesson.id) {
        setSelectedType(null);
        setSelectedId('');
      }
      onNotify('info', 'Lesson removed.');
    }
  };

  const handleHeaderSave = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (selectedType === 'topic') {
      handleSaveTopicChanges(e || ({ preventDefault: () => {} } as any));
    } else if (selectedType === 'lesson') {
      handleSaveLessonChanges(e || ({ preventDefault: () => {} } as any));
    } else {
      onNotify('info', 'All curriculum changes are saved.');
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        breadcrumbs={[
          { label: 'Courses', onClick: () => onNavigate('courses') },
          { label: course.title, onClick: () => onNavigate('course_overview', { courseId: course.id }) },
          { label: 'Curriculum Editor', active: true },
        ]}
        title="Curriculum Editor"
        description="Structure course units into sequential topics and sub-lessons. Define lesson content and prerequisite dependency rules."
        courseBadge={course.title}
        primaryAction={
          <div className="flex items-center gap-2">
            {hasUnsavedChanges ? (
              <Button
                variant="primary"
                size="sm"
                leftIcon={<Save className="w-4 h-4" />}
                onClick={handleHeaderSave}
                className="bg-[#2646B8] hover:bg-[#1D358F] text-white shadow-xs font-semibold animate-pulse"
              >
                Save changes
              </Button>
            ) : (
              <span className="flex items-center gap-1.5 text-xs text-[#18794E] font-medium bg-[#EAF7F0] px-2.5 py-1.5 rounded-lg border border-[#18794E]/20">
                <CheckCircle2 className="w-3.5 h-3.5" />
                All changes saved
              </span>
            )}
            <Button
              variant="outline"
              size="sm"
              leftIcon={<Plus className="w-4 h-4" />}
              onClick={handleAddTopic}
            >
              Add topic
            </Button>
          </div>
        }
      />

      {/* Split-pane desktop container (30-35% tree, 65-70% editor) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Pane: Tree View (35%) */}
        <div className="lg:col-span-4 bg-white dark:bg-[#181C24] rounded-xl border border-[#D9DEE7] dark:border-[#2D3545] p-4 shadow-2xs flex flex-col gap-3">
          <div className="flex items-center justify-between pb-3 border-b border-[#D9DEE7] dark:border-[#2D3545] dark:border-[#2D3545] dark:border-[#2D3545]">
            <div className="flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-[#3156D3]" />
              <h2 className="text-sm font-bold text-[#1F2937] dark:text-white dark:text-white dark:text-white">Curriculum Tree</h2>
            </div>
            <button
              onClick={handleAddTopic}
              className="text-xs text-[#3156D3] font-semibold hover:underline flex items-center gap-1 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              Add topic
            </button>
          </div>

          {sortedTopics.length === 0 ? (
            <div className="text-center py-8 px-4 text-[#5B6472] dark:text-gray-400 dark:text-gray-400 dark:text-gray-400">
              <Layers className="w-8 h-8 text-gray-400 mx-auto mb-2" />
              <p className="text-xs font-semibold text-[#1F2937] dark:text-white dark:text-white dark:text-white">No topics added yet</p>
              <p className="text-xs text-[#5B6472] dark:text-gray-400 dark:text-gray-400 dark:text-gray-400 mt-1 mb-4">
                Click Add Topic to create your first curriculum unit.
              </p>
              <Button size="sm" variant="primary" onClick={handleAddTopic}>
                Add topic
              </Button>
            </div>
          ) : (
            <div className="space-y-2 max-h-[650px] overflow-y-auto pr-1">
              {sortedTopics.map((t, idx) => {
                const topicLessons = lessons
                  .filter((l) => l.topicId === t.id)
                  .sort((a, b) => a.order - b.order);
                const topicAssessments = assessments
                  .filter((a) => a.topicId === t.id);
                const isSelected = selectedType === 'topic' && selectedId === t.id;
                const isExpanded = !!expandedTopics[t.id];

                return (
                  <div key={t.id} className="rounded-lg border border-[#D9DEE7] dark:border-[#2D3545] overflow-hidden bg-white dark:bg-[#181C24]">
                    {/* Topic Row */}
                    <div
                      className={`flex items-center justify-between p-2.5 transition-colors cursor-pointer select-none ${
                        isSelected
                          ? 'bg-[#E8EEFF] dark:bg-indigo-950/40 border-l-4 border-l-[#3156D3] text-[#2646B8] dark:text-indigo-300 font-semibold'
                          : 'hover:bg-gray-50 dark:bg-[#1C212B] text-[#1F2937] dark:text-white dark:text-white dark:text-white'
                      }`}
                      onClick={() => selectTopicNode(t)}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleExpand(t.id);
                          }}
                          className="p-1 hover:bg-black/5 rounded text-[#737D8C] dark:text-gray-400 dark:text-gray-400 dark:text-gray-400 cursor-pointer"
                          aria-label={isExpanded ? 'Collapse topic' : 'Expand topic'}
                        >
                          {isExpanded ? (
                            <ChevronDown className="w-3.5 h-3.5" />
                          ) : (
                            <ChevronRight className="w-3.5 h-3.5" />
                          )}
                        </button>
                        <Layers className="w-4 h-4 shrink-0 text-[#3156D3]" />
                        <span className="text-xs font-medium truncate" title={t.title}>
                          {t.title}
                        </span>
                      </div>

                      {/* Reorder and Add Lesson quick icons */}
                      <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
                        <button
                          disabled={idx === 0}
                          onClick={() => handleMoveTopic(idx, 'up')}
                          className="p-1 text-[#737D8C] dark:text-gray-400 dark:text-gray-400 dark:text-gray-400 hover:text-[#1F2937] dark:text-white dark:text-white dark:text-white disabled:opacity-30 cursor-pointer"
                          title="Move up"
                          aria-label={`Move topic ${t.title} up`}
                        >
                          <ArrowUp className="w-3 h-3" />
                        </button>
                        <button
                          disabled={idx === sortedTopics.length - 1}
                          onClick={() => handleMoveTopic(idx, 'down')}
                          className="p-1 text-[#737D8C] dark:text-gray-400 dark:text-gray-400 dark:text-gray-400 hover:text-[#1F2937] dark:text-white dark:text-white dark:text-white disabled:opacity-30 cursor-pointer"
                          title="Move down"
                          aria-label={`Move topic ${t.title} down`}
                        >
                          <ArrowDown className="w-3 h-3" />
                        </button>
                        <button
                          onClick={() => handleAddLesson(t.id)}
                          className="p-1 text-[#3156D3] hover:bg-[#E8EEFF] dark:hover:bg-indigo-950/40 rounded cursor-pointer ml-1"
                          title="Add lesson to this topic"
                          aria-label={`Add lesson to topic ${t.title}`}
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Lessons & Assessments list under this topic */}
                    {isExpanded && (
                      <div className="bg-[#F5F7FA] dark:bg-[#151922] dark:bg-[#151922] dark:bg-[#151922] border-t border-[#D9DEE7] dark:border-[#2D3545] dark:border-[#2D3545] dark:border-[#2D3545] p-2 space-y-2">
                        {/* Lessons Section */}
                        <div>
                          <div className="flex items-center justify-between text-[10px] font-bold text-gray-500 uppercase tracking-wider px-1 pb-1">
                            <span>Lessons ({topicLessons.length})</span>
                            <button
                              onClick={() => handleAddLesson(t.id)}
                              className="text-[#3156D3] font-semibold hover:underline flex items-center gap-0.5 cursor-pointer lowercase"
                            >
                              <Plus className="w-3 h-3" /> add lesson
                            </button>
                          </div>
                          {topicLessons.length === 0 ? (
                            <div className="py-1.5 px-2 text-[11px] text-[#737D8C] dark:text-gray-400 bg-white/60 dark:bg-[#181C24]/60 rounded border border-dashed border-gray-200 dark:border-gray-800">
                              No lessons yet
                            </div>
                          ) : (
                            <div className="space-y-1">
                              {topicLessons.map((l) => {
                                const isLessonSelected = selectedType === 'lesson' && selectedId === l.id;
                                const resCount = resources.filter((r) => r.lessonId === l.id).length;

                                return (
                                  <div
                                    key={l.id}
                                    onClick={() => selectLessonNode(l)}
                                    className={`py-1.5 px-2.5 rounded flex items-center justify-between text-xs transition-colors cursor-pointer ${
                                      isLessonSelected
                                        ? 'bg-[#E8EEFF] dark:bg-indigo-950/40 text-[#2646B8] dark:text-indigo-300 font-semibold border-l-2 border-l-[#2646B8]'
                                        : 'hover:bg-white dark:hover:bg-[#1E232E] text-[#5B6472] dark:text-gray-400'
                                    }`}
                                  >
                                    <div className="flex items-center gap-2 truncate">
                                      <FileText className="w-3.5 h-3.5 shrink-0 text-gray-400" />
                                      <span className="truncate">{l.title}</span>
                                    </div>
                                    <span className="text-[10px] text-[#737D8C] dark:text-gray-400 shrink-0 bg-white dark:bg-[#181C24] px-1.5 py-0.5 rounded border border-gray-200 dark:border-gray-800">
                                      {resCount} res
                                    </span>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>

                        {/* Assessments Section */}
                        <div className="pt-1.5 border-t border-gray-200 dark:border-gray-800 dark:border-gray-800 dark:border-gray-800/80">
                          <div className="flex items-center justify-between text-[10px] font-bold text-gray-500 uppercase tracking-wider px-1 pb-1">
                            <span>Assessments ({topicAssessments.length})</span>
                            <button
                              onClick={() => handleOpenAssessmentDrawer(t)}
                              className="text-indigo-600 font-semibold hover:underline flex items-center gap-0.5 cursor-pointer lowercase"
                            >
                              <Plus className="w-3 h-3" /> add assessment
                            </button>
                          </div>
                          {topicAssessments.length === 0 ? (
                            <div className="py-1.5 px-2 text-[11px] text-[#737D8C] dark:text-gray-400 bg-white/60 dark:bg-[#181C24]/60 rounded border border-dashed border-gray-200 dark:border-gray-800 flex items-center justify-between">
                              <span>No assessments yet</span>
                              <button
                                onClick={() => handleOpenAssessmentDrawer(t)}
                                className="text-indigo-600 font-semibold hover:underline cursor-pointer"
                              >
                                + Add quiz
                              </button>
                            </div>
                          ) : (
                            <div className="space-y-1">
                              {topicAssessments.map((a) => (
                                <div
                                  key={a.id}
                                  onClick={() =>
                                    onNavigate('assessment_editor', {
                                      assessmentId: a.id,
                                    })
                                  }
                                  className="py-1.5 px-2.5 rounded bg-white dark:bg-[#181C24] hover:bg-indigo-50/50 dark:hover:bg-indigo-950/30 border border-gray-200 dark:border-gray-800 flex items-center justify-between text-xs transition-colors cursor-pointer group"
                                >
                                  <div className="flex items-center gap-2 truncate">
                                    <CheckSquare className="w-3.5 h-3.5 shrink-0 text-indigo-600" />
                                    <span className="truncate text-gray-900 dark:text-white dark:text-white dark:text-white group-hover:text-indigo-700 font-medium">
                                      {a.title}
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-1.5 shrink-0">
                                    <span className="text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-700 border border-indigo-200">
                                      {a.type}
                                    </span>
                                    <span className="text-[10px] text-gray-500">
                                      {a.questionIds?.length || 0}Q
                                    </span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right Pane: Selected Node Editor (65%) */}
        <div className="lg:col-span-8 bg-white dark:bg-[#181C24] rounded-xl border border-[#D9DEE7] dark:border-[#2D3545] p-6 shadow-2xs">
          {selectedType === 'topic' && currentTopic ? (
            <div className="space-y-6">
              <div className="flex items-center justify-between pb-4 border-b border-[#D9DEE7] dark:border-[#2D3545] dark:border-[#2D3545] dark:border-[#2D3545]">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold bg-[#E8EEFF] dark:bg-indigo-950/40 text-[#2646B8] dark:text-indigo-300 px-2 py-0.5 rounded">
                      Topic #{currentTopic.order}
                    </span>
                    <h2 className="text-lg font-bold text-[#1F2937] dark:text-white dark:text-white dark:text-white">{currentTopic.title}</h2>
                  </div>
                  <p className="text-xs text-[#5B6472] dark:text-gray-400 dark:text-gray-400 dark:text-gray-400 mt-0.5">
                    Configure unit learning goals, academic mastery threshold, and prerequisites.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    leftIcon={<GitBranch className="w-3.5 h-3.5" />}
                    onClick={() =>
                      onNavigate('prerequisites', {
                        courseId: course.id,
                        topicId: currentTopic.id,
                      })
                    }
                  >
                    Manage prerequisites ({currentTopic.prerequisiteTopicIds.length})
                  </Button>
                  <Button
                    variant="danger"
                    size="sm"
                    leftIcon={<Trash2 className="w-3.5 h-3.5" />}
                    onClick={() => setConfirmDeleteTopic(currentTopic)}
                  >
                    Delete topic
                  </Button>
                </div>
              </div>

              <form onSubmit={handleSaveTopicChanges} className="space-y-5">
                <FormField
                  id="topic-title-input"
                  label="Topic title"
                  required
                  helperText="Clear unit name describing core syllabus concepts."
                >
                  <input
                    id="topic-title-input"
                    type="text"
                    value={topicTitle}
                    onChange={(e) => {
                      setTopicTitle(e.target.value);
                      setHasUnsavedChanges(true);
                    }}
                    className="w-full bg-white dark:bg-[#1E232E] border border-[#D9DEE7] dark:border-gray-700 text-sm text-gray-900 dark:text-white dark:text-white dark:text-white dark:text-white rounded-lg px-3.5 py-2.5 focus:border-[#3156D3] focus:outline-none"
                  />
                </FormField>

                <FormField
                  id="topic-desc-input"
                  label="Topic description / Syllabus summary"
                  helperText="Explanation of theoretical objectives and competencies."
                >
                  <textarea
                    id="topic-desc-input"
                    rows={3}
                    value={topicDesc}
                    onChange={(e) => {
                      setTopicDesc(e.target.value);
                      setHasUnsavedChanges(true);
                    }}
                    className="w-full bg-white dark:bg-[#1E232E] border border-[#D9DEE7] dark:border-gray-700 text-sm text-gray-900 dark:text-white dark:text-white dark:text-white dark:text-white rounded-lg px-3.5 py-2.5 focus:border-[#3156D3] focus:outline-none"
                  />
                </FormField>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <FormField
                    id="topic-threshold"
                    label="Academic mastery threshold (%)"
                    helperText="Minimum assessment score percentage required before downstream dependent topics unlock."
                  >
                    <input
                      id="topic-threshold"
                      type="number"
                      min="50"
                      max="100"
                      value={topicThreshold}
                      onChange={(e) => {
                        setTopicThreshold(parseInt(e.target.value, 10) || 75);
                        setHasUnsavedChanges(true);
                      }}
                      className="w-full bg-white dark:bg-[#1E232E] border border-[#D9DEE7] dark:border-gray-700 text-sm text-gray-900 dark:text-white dark:text-white dark:text-white dark:text-white rounded-lg px-3.5 py-2 focus:border-[#3156D3] focus:outline-none"
                    />
                  </FormField>

                  <div className="p-3 rounded-lg bg-gray-50 dark:bg-[#1C212B] border border-gray-200 dark:border-gray-800 flex flex-col justify-between">
                    <div>
                      <span className="text-xs font-semibold text-[#1F2937] dark:text-white dark:text-white dark:text-white">Prerequisite Status</span>
                      <p className="text-xs text-[#5B6472] dark:text-gray-400 dark:text-gray-400 dark:text-gray-400 mt-0.5">
                        {currentTopic.prerequisiteTopicIds.length === 0
                          ? 'Foundational topic (No prerequisites required).'
                          : `Requires ${currentTopic.prerequisiteTopicIds.length} prior topic(s) to be mastered.`}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() =>
                        onNavigate('prerequisites', {
                          courseId: course.id,
                          topicId: currentTopic.id,
                        })
                      }
                      className="text-xs text-[#3156D3] font-semibold hover:underline text-left cursor-pointer mt-2"
                    >
                      Open Prerequisite Manager →
                    </button>
                  </div>
                </div>

                {/* Topic Assessments section */}
                <div className="p-4 rounded-xl bg-gray-50 dark:bg-[#1C212B]/80 dark:bg-[#1C212B]/80 border border-gray-200 dark:border-gray-800 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-xs font-bold uppercase tracking-wider text-[#1F2937] dark:text-white dark:text-white dark:text-white flex items-center gap-1.5">
                        <CheckSquare className="w-4 h-4 text-indigo-600" />
                        Topic Assessments & Quizzes ({assessments.filter((a) => a.topicId === currentTopic.id).length})
                      </h4>
                      <p className="text-xs text-[#5B6472] dark:text-gray-400 dark:text-gray-400 dark:text-gray-400 mt-0.5">
                        Assessments configured to measure learner mastery for this unit.
                      </p>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      leftIcon={<Plus className="w-3.5 h-3.5" />}
                      onClick={() => handleOpenAssessmentDrawer(currentTopic)}
                    >
                      New assessment
                    </Button>
                  </div>
                  {assessments.filter((a) => a.topicId === currentTopic.id).length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                      {assessments
                        .filter((a) => a.topicId === currentTopic.id)
                        .map((a) => (
                          <div
                            key={a.id}
                            onClick={() => onNavigate('assessment_editor', { assessmentId: a.id })}
                            className="p-2.5 rounded-lg bg-white dark:bg-[#181C24] border border-gray-200 dark:border-gray-800 hover:border-indigo-300 transition-colors cursor-pointer flex items-center justify-between"
                          >
                            <div className="min-w-0 pr-2">
                              <p className="text-xs font-semibold text-gray-900 dark:text-white dark:text-white dark:text-white truncate">{a.title}</p>
                              <p className="text-[11px] text-gray-500 capitalize">
                                {a.type} • {a.questionIds?.length || 0} questions
                              </p>
                            </div>
                            <span
                              className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                                a.status === 'published'
                                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                  : 'bg-amber-50 text-amber-700 border border-amber-200'
                              }`}
                            >
                              {a.status}
                            </span>
                          </div>
                        ))}
                    </div>
                  ) : (
                    <p className="text-xs text-gray-500 dark:text-gray-400 italic bg-white dark:bg-[#181C24] p-2.5 rounded-lg border border-dashed border-gray-200 dark:border-gray-800">
                      No assessments created for this topic yet. Click "New assessment" to create a diagnostic or topic quiz.
                    </p>
                  )}
                </div>

                <div className="pt-4 border-t border-[#D9DEE7] dark:border-[#2D3545] dark:border-[#2D3545] dark:border-[#2D3545] flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      leftIcon={<Plus className="w-3.5 h-3.5" />}
                      onClick={() => handleAddLesson(currentTopic.id)}
                    >
                      Add lesson
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      leftIcon={<CheckSquare className="w-3.5 h-3.5 text-indigo-600" />}
                      onClick={() => handleOpenAssessmentDrawer(currentTopic)}
                    >
                      Add assessment
                    </Button>
                  </div>
                  <Button
                    type="submit"
                    variant="primary"
                    leftIcon={<Save className="w-4 h-4" />}
                    disabled={!hasUnsavedChanges}
                  >
                    Save changes
                  </Button>
                </div>
              </form>
            </div>
          ) : selectedType === 'lesson' && currentLesson ? (
            <div className="space-y-6">
              <div className="flex items-center justify-between pb-4 border-b border-[#D9DEE7] dark:border-[#2D3545] dark:border-[#2D3545] dark:border-[#2D3545]">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold bg-[#EFF8FF] text-[#175CD3] px-2 py-0.5 rounded">
                      Lesson #{currentLesson.order}
                    </span>
                    <h2 className="text-lg font-bold text-[#1F2937] dark:text-white dark:text-white dark:text-white">{currentLesson.title}</h2>
                  </div>
                  <p className="text-xs text-[#5B6472] dark:text-gray-400 dark:text-gray-400 dark:text-gray-400 mt-0.5">
                    Parent Topic: {sortedTopics.find((t) => t.id === currentLesson.topicId)?.title}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    leftIcon={<FileText className="w-3.5 h-3.5" />}
                    onClick={() =>
                      onNavigate('resources', {
                        courseId: course.id,
                        topicId: currentLesson.topicId,
                        lessonId: currentLesson.id,
                      })
                    }
                  >
                    Manage learning resources
                  </Button>
                  <Button
                    variant="danger"
                    size="sm"
                    leftIcon={<Trash2 className="w-3.5 h-3.5" />}
                    onClick={() => setConfirmDeleteLesson(currentLesson)}
                  >
                    Delete lesson
                  </Button>
                </div>
              </div>

              <form onSubmit={handleSaveLessonChanges} className="space-y-5">
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                  <div className="sm:col-span-3">
                    <FormField
                      id="lesson-title-input"
                      label="Lesson title"
                      required
                      helperText="Concise title for the lesson content."
                    >
                      <input
                        id="lesson-title-input"
                        type="text"
                        value={lessonTitle}
                        onChange={(e) => {
                          setLessonTitle(e.target.value);
                          setHasUnsavedChanges(true);
                        }}
                        className="w-full bg-white dark:bg-[#1E232E] border border-[#D9DEE7] dark:border-gray-700 text-sm text-gray-900 dark:text-white dark:text-white dark:text-white dark:text-white rounded-lg px-3.5 py-2.5 focus:border-[#3156D3] focus:outline-none"
                      />
                    </FormField>
                  </div>
                  <div className="sm:col-span-1">
                    <FormField
                      id="lesson-order-input"
                      label="Unit / Order"
                      required
                      helperText="Sequence."
                    >
                      <input
                        id="lesson-order-input"
                        type="number"
                        min="1"
                        value={lessonOrder}
                        onChange={(e) => {
                          setLessonOrder(Math.max(1, parseInt(e.target.value, 10) || 1));
                          setHasUnsavedChanges(true);
                        }}
                        className="w-full bg-white dark:bg-[#1E232E] border border-[#D9DEE7] dark:border-gray-700 text-sm text-gray-900 dark:text-white dark:text-white dark:text-white dark:text-white rounded-lg px-3.5 py-2.5 focus:border-[#3156D3] focus:outline-none"
                      />
                    </FormField>
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label htmlFor="lesson-desc-input" className="block text-xs font-semibold text-[#1F2937] dark:text-white dark:text-white dark:text-white dark:text-gray-200">
                      Lesson Introduction & Content (Markdown Supported)
                    </label>
                    <div className="flex items-center bg-gray-100 dark:bg-gray-800 p-0.5 rounded-lg border border-gray-200 dark:border-gray-700">
                      <button
                        type="button"
                        onClick={() => setLessonDescPreview(false)}
                        className={`px-2.5 py-1 text-xs font-semibold rounded-md flex items-center gap-1 transition cursor-pointer ${
                          !lessonDescPreview
                            ? 'bg-white dark:bg-gray-700 text-indigo-600 dark:text-indigo-400 shadow-2xs'
                            : 'text-gray-500 hover:text-gray-700 dark:text-gray-400'
                        }`}
                      >
                        <Edit3 className="w-3 h-3" />
                        Write
                      </button>
                      <button
                        type="button"
                        onClick={() => setLessonDescPreview(true)}
                        className={`px-2.5 py-1 text-xs font-semibold rounded-md flex items-center gap-1 transition cursor-pointer ${
                          lessonDescPreview
                            ? 'bg-white dark:bg-gray-700 text-indigo-600 dark:text-indigo-400 shadow-2xs'
                            : 'text-gray-500 hover:text-gray-700 dark:text-gray-400'
                        }`}
                      >
                        <Eye className="w-3 h-3" />
                        Preview
                      </button>
                    </div>
                  </div>
                  <p className="text-[11px] text-[#737D8C] dark:text-gray-400 dark:text-gray-400 dark:text-gray-400 mb-2">
                    Author the introduction and conceptual notes for this lesson. This is displayed directly to students on their lesson workspace.
                  </p>
                  {lessonDescPreview ? (
                    <div className="min-h-[160px] p-4 bg-gray-50 dark:bg-[#1E232E]/60 border border-[#D9DEE7] dark:border-gray-700 rounded-lg text-sm text-gray-800 dark:text-gray-200">
                      {lessonDesc.trim() ? (
                        <RichMarkdownRenderer content={lessonDesc} />
                      ) : (
                        <p className="text-xs text-gray-400 italic">No introduction content written yet. Switch to the Write tab to add notes.</p>
                      )}
                    </div>
                  ) : (
                    <textarea
                      id="lesson-desc-input"
                      rows={6}
                      value={lessonDesc}
                      onChange={(e) => {
                        setLessonDesc(e.target.value);
                        setHasUnsavedChanges(true);
                      }}
                      placeholder="Write the lesson introduction, core architectural invariants, and instructional notes (supports Markdown)..."
                      className="w-full bg-white dark:bg-[#1E232E] border border-[#D9DEE7] dark:border-gray-700 text-sm rounded-lg px-3.5 py-2.5 focus:border-[#3156D3] focus:outline-none"
                    />
                  )}
                </div>

                {/* Attached resources summary */}
                <div className="bg-gray-50 dark:bg-[#1C212B] border border-gray-200 dark:border-gray-800 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-semibold text-[#1F2937] dark:text-white dark:text-white dark:text-white">
                      Attached Learning Resources ({resources.filter((r) => r.lessonId === currentLesson.id).length})
                    </span>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleOpenUploadModal(currentLesson)}
                        className="text-xs text-indigo-600 font-semibold hover:underline cursor-pointer flex items-center gap-1"
                      >
                        <UploadCloud className="w-3.5 h-3.5" />
                        + Upload from PC
                      </button>
                      <span className="text-gray-300">|</span>
                      <button
                        type="button"
                        onClick={() =>
                          onNavigate('resources', {
                            courseId: course.id,
                            topicId: currentLesson.topicId,
                            lessonId: currentLesson.id,
                          })
                        }
                        className="text-xs text-[#3156D3] font-semibold hover:underline cursor-pointer"
                      >
                        + Add link/code
                      </button>
                    </div>
                  </div>
                  {resources.filter((r) => r.lessonId === currentLesson.id).length === 0 ? (
                    <p className="text-xs text-[#737D8C] dark:text-gray-400 dark:text-gray-400 dark:text-gray-400">
                      No documents, videos, or code attached to this lesson yet.
                    </p>
                  ) : (
                    <div className="space-y-1.5 mt-2">
                      {resources
                        .filter((r) => r.lessonId === currentLesson.id)
                        .map((res) => (
                          <div
                            key={res.id}
                            className="bg-white dark:bg-[#181C24] p-2 rounded border border-gray-200 dark:border-gray-800 text-xs flex items-center justify-between"
                          >
                            <span className="font-medium text-[#1F2937] dark:text-white dark:text-white dark:text-white truncate">{res.title}</span>
                            <span className="text-[10px] uppercase font-semibold text-[#3156D3] dark:text-indigo-300 bg-[#E8EEFF] dark:bg-indigo-950/40 px-2 py-0.5 rounded">
                              {res.type}
                            </span>
                          </div>
                        ))}
                    </div>
                  )}
                </div>

                <div className="pt-4 border-t border-[#D9DEE7] dark:border-[#2D3545] dark:border-[#2D3545] dark:border-[#2D3545] flex justify-end">
                  <Button
                    type="submit"
                    variant="primary"
                    leftIcon={<Save className="w-4 h-4" />}
                    disabled={!hasUnsavedChanges}
                  >
                    Save changes
                  </Button>
                </div>
              </form>
            </div>
          ) : (
            <div className="text-center py-16 text-[#5B6472] dark:text-gray-400 dark:text-gray-400 dark:text-gray-400">
              <Layers className="w-10 h-10 text-gray-300 mx-auto mb-2" />
              <p className="text-sm font-semibold text-[#1F2937] dark:text-white dark:text-white dark:text-white">Select a topic or lesson</p>
              <p className="text-xs text-[#5B6472] dark:text-gray-400 dark:text-gray-400 dark:text-gray-400 mt-1">
                Choose an item in the tree on the left to edit its parameters or add new content.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Delete Topic Confirmation Modal */}
      <ConfirmDialog
        isOpen={!!confirmDeleteTopic}
        title="Delete topic from curriculum?"
        targetObject={confirmDeleteTopic?.title}
        consequence="Deleting this topic will remove its nested lessons and invalidate any prerequisite references from other topics."
        isDestructive
        confirmLabel="Delete topic"
        onConfirm={handleDeleteTopicConfirm}
        onCancel={() => setConfirmDeleteTopic(null)}
      />

      {/* Delete Lesson Confirmation Modal */}
      <ConfirmDialog
        isOpen={!!confirmDeleteLesson}
        title="Delete lesson?"
        targetObject={confirmDeleteLesson?.title}
        consequence="Attached learning resources for this lesson will be unlinked."
        isDestructive
        confirmLabel="Delete lesson"
        onConfirm={handleDeleteLessonConfirm}
        onCancel={() => setConfirmDeleteLesson(null)}
      />

      {/* Slide-over Assessment Picker Drawer */}
      {isAssessmentDrawerOpen && drawerTopic && (
        <div className="fixed inset-0 z-50 overflow-hidden" role="dialog" aria-modal="true">
          <div
            className="fixed inset-0 bg-black/40 backdrop-blur-xs transition-opacity"
            onClick={() => setIsAssessmentDrawerOpen(false)}
          />
          <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
            <div className="w-screen max-w-full sm:max-w-md bg-white dark:bg-[#181C24] shadow-2xl flex flex-col">
              {/* Drawer Header */}
              <div className="p-5 border-b border-gray-200 dark:border-gray-800 dark:border-gray-800 dark:border-gray-800 dark:border-gray-800 flex items-center justify-between bg-gray-50 dark:bg-[#1C212B]">
                <div>
                  <div className="flex items-center gap-2">
                    <CheckSquare className="w-4 h-4 text-indigo-600" />
                    <h3 className="text-sm font-bold text-gray-900 dark:text-white dark:text-white dark:text-white">Attach Assessment to Topic</h3>
                  </div>
                  <p className="text-xs text-gray-500 mt-1 line-clamp-1">
                    Target: <span className="font-semibold text-gray-800">{drawerTopic.title}</span>
                  </p>
                </div>
                <button
                  onClick={() => setIsAssessmentDrawerOpen(false)}
                  className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-200/60 transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Drawer Search & Instructions */}
              <div className="p-4 border-b border-gray-100 dark:border-gray-800 bg-white dark:bg-[#181C24] space-y-2">
                <p className="text-xs text-gray-600">
                  Select an assessment for <span className="font-semibold">{course.title}</span> to measure learner mastery in this unit.
                </p>
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="search"
                    value={assessmentDrawerSearch}
                    onChange={(e) => setAssessmentDrawerSearch(e.target.value)}
                    placeholder="Filter course assessments..."
                    className="w-full pl-8 pr-3 py-1.5 text-xs bg-gray-50 dark:bg-[#1C212B] border border-gray-200 dark:border-gray-800 rounded-lg focus:bg-white focus:border-indigo-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* Drawer List */}
              <div className="flex-1 overflow-y-auto p-4 space-y-2.5">
                {assessments.filter((a) => a.courseId === course.id).length === 0 ? (
                  <div className="text-center py-12 px-4">
                    <ClipboardList className="w-10 h-10 text-gray-300 mx-auto mb-2" />
                    <p className="text-xs font-semibold text-gray-800">No assessments found for this course</p>
                    <p className="text-[11px] text-gray-500 mt-1">
                      Create an assessment for this course to attach it here.
                    </p>
                  </div>
                ) : (
                  assessments
                    .filter((a) => a.courseId === course.id)
                    .filter(
                      (a) =>
                        !assessmentDrawerSearch.trim() ||
                        a.title.toLowerCase().includes(assessmentDrawerSearch.toLowerCase()) ||
                        a.type.toLowerCase().includes(assessmentDrawerSearch.toLowerCase())
                    )
                    .map((a) => {
                      const isAttachedHere = a.topicId === drawerTopic.id;
                      const otherTopic =
                        a.topicId && a.topicId !== drawerTopic.id
                          ? topics.find((t) => t.id === a.topicId)
                          : null;

                      return (
                        <div
                          key={a.id}
                          className={`p-3.5 rounded-xl border transition-all ${
                            isAttachedHere
                              ? 'bg-indigo-50/40 border-indigo-200 ring-1 ring-indigo-200'
                              : 'bg-white dark:bg-[#181C24] border-gray-200 dark:border-gray-800 hover:border-gray-300 hover:shadow-xs'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <h4 className="text-xs font-bold text-gray-900 dark:text-white dark:text-white dark:text-white line-clamp-1">{a.title}</h4>
                              <div className="flex items-center gap-1.5 mt-1">
                                <span className="text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-700 border border-indigo-200">
                                  {a.type}
                                </span>
                                <span className="text-[10px] text-gray-500">
                                  {a.questionIds?.length || 0} questions
                                </span>
                                <span
                                  className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${
                                    a.status === 'published'
                                      ? 'bg-emerald-50 text-emerald-700'
                                      : 'bg-amber-50 text-amber-700'
                                  }`}
                                >
                                  {a.status}
                                </span>
                              </div>
                              {otherTopic && (
                                <p className="text-[10px] text-gray-500 mt-1">
                                  Currently attached to: <span className="font-medium text-gray-700">{otherTopic.title}</span>
                                </p>
                              )}
                            </div>
                          </div>

                          <div className="mt-3 pt-2.5 border-t border-gray-100 flex items-center justify-between">
                            {isAttachedHere ? (
                              <span className="text-xs font-semibold text-emerald-600 flex items-center gap-1">
                                <CheckCircle2 className="w-3.5 h-3.5" /> Attached to this topic
                              </span>
                            ) : (
                              <Button
                                size="sm"
                                variant="primary"
                                onClick={() => handleAttachAssessment(a, drawerTopic)}
                              >
                                {otherTopic ? 'Reassign to this topic' : 'Attach to topic'}
                              </Button>
                            )}

                            <button
                              type="button"
                              onClick={() => {
                                setIsAssessmentDrawerOpen(false);
                                onNavigate('assessment_editor', { assessmentId: a.id });
                              }}
                              className="text-[11px] text-gray-500 hover:text-indigo-600 flex items-center gap-0.5 cursor-pointer"
                            >
                              <ExternalLink className="w-3 h-3" /> Edit
                            </button>
                          </div>
                        </div>
                      );
                    })
                )}
              </div>

              {/* Drawer Footer */}
              <div className="p-4 border-t border-gray-200 dark:border-gray-800 dark:border-gray-800 dark:border-gray-800 bg-gray-50 dark:bg-[#1C212B] space-y-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full justify-center"
                  leftIcon={<Plus className="w-3.5 h-3.5" />}
                  onClick={() => {
                    setIsAssessmentDrawerOpen(false);
                    onNavigate('assessment_editor', {
                      courseId: course.id,
                      topicId: drawerTopic.id,
                    });
                  }}
                >
                  Create new assessment in editor
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full justify-center text-gray-500"
                  onClick={() => setIsAssessmentDrawerOpen(false)}
                >
                  Close
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Upload Files from PC Modal */}
      {isUploadModalOpen && uploadTargetLesson && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/45 backdrop-blur-xs"
          role="dialog"
          aria-modal="true"
        >
          <div className="bg-white dark:bg-[#181C24] rounded-2xl max-w-lg w-full p-6 shadow-xl border border-[#D9DEE7] dark:border-[#2D3545] flex flex-col max-h-[85vh]">
            <div className="flex items-center justify-between pb-3 border-b border-gray-200 dark:border-gray-800 dark:border-gray-800 dark:border-gray-800">
              <div className="flex items-center gap-2">
                <UploadCloud className="w-5 h-5 text-indigo-600" />
                <h3 className="text-base font-bold text-gray-900 dark:text-white dark:text-white dark:text-white">Upload Resources from Computer</h3>
              </div>
              <button
                onClick={() => {
                  setIsUploadModalOpen(false);
                  setStagedFiles([]);
                  setUploadError(null);
                }}
                className="p-1 rounded-lg text-gray-400 hover:text-gray-600 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-gray-500 mt-2">
              Target lesson: <span className="font-semibold text-gray-800">{uploadTargetLesson.title}</span>
            </p>

            <div className="mt-4 flex-1 overflow-y-auto space-y-3">
              {/* Drop area */}
              <label className="border-2 border-dashed border-gray-300 hover:border-indigo-500 rounded-xl p-5 flex flex-col items-center justify-center text-center cursor-pointer bg-gray-50 dark:bg-[#1C212B]/60 hover:bg-indigo-50/30 transition-colors">
                <UploadCloud className="w-8 h-8 text-indigo-500 mb-2" />
                <span className="text-xs font-semibold text-gray-800">
                  Click or drag files here to upload
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
                <div className="space-y-1.5 pt-2">
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
                  <div className="space-y-1 max-h-48 overflow-y-auto">
                    {stagedFiles.map((file, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between p-2 rounded-lg bg-gray-50 dark:bg-[#1C212B] border border-gray-200 dark:border-gray-800 text-xs"
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
            </div>

            <div className="mt-4 pt-3 border-t border-gray-200 dark:border-gray-800 dark:border-gray-800 dark:border-gray-800 flex items-center justify-end gap-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => {
                  setIsUploadModalOpen(false);
                  setStagedFiles([]);
                  setUploadError(null);
                }}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                size="sm"
                disabled={stagedFiles.length === 0}
                onClick={handleUploadStagedFiles}
              >
                Attach {stagedFiles.length} file(s)
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Create New Lesson Modal */}
      {addLessonTopic && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/45 backdrop-blur-xs"
          role="dialog"
          aria-modal="true"
        >
          <div className="bg-white dark:bg-[#181C24] rounded-2xl max-w-lg w-full p-6 shadow-xl border border-[#D9DEE7] dark:border-gray-800 flex flex-col max-h-[85vh]">
            <div className="flex items-center justify-between pb-3 border-b border-gray-200 dark:border-gray-800 dark:border-gray-800 dark:border-gray-800 dark:border-gray-800">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                <h3 className="text-base font-bold text-gray-900 dark:text-white dark:text-white dark:text-white dark:text-white">Create New Lesson</h3>
              </div>
              <button
                type="button"
                onClick={() => setAddLessonTopic(null)}
                className="p-1 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="mt-3">
              <span className="text-xs text-gray-500 dark:text-gray-400">Target Topic:</span>{' '}
              <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                {addLessonTopic.title}
              </span>
            </div>

            <form onSubmit={handleCreateLessonSubmit} className="mt-4 space-y-4 flex-1 overflow-y-auto">
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                <div className="sm:col-span-3">
                  <FormField
                    id="new-lesson-title"
                    label="Lesson title"
                    required
                    helperText="Concise name for the lesson unit."
                  >
                    <input
                      id="new-lesson-title"
                      type="text"
                      autoFocus
                      value={newLessonTitle}
                      onChange={(e) => setNewLessonTitle(e.target.value)}
                      placeholder="e.g. Memory Hierarchy & Cache Lines"
                      className="w-full bg-white dark:bg-[#1E232E] border border-[#D9DEE7] dark:border-gray-700 text-sm rounded-lg px-3.5 py-2.5 focus:border-[#3156D3] focus:outline-none"
                    />
                  </FormField>
                </div>
                <div className="sm:col-span-1">
                  <FormField
                    id="new-lesson-order"
                    label="Sequence"
                    required
                    helperText="Order."
                  >
                    <input
                      id="new-lesson-order"
                      type="number"
                      min="1"
                      value={newLessonOrder}
                      onChange={(e) => setNewLessonOrder(Math.max(1, parseInt(e.target.value, 10) || 1))}
                      className="w-full bg-white dark:bg-[#1E232E] border border-[#D9DEE7] dark:border-gray-700 text-sm rounded-lg px-3.5 py-2.5 focus:border-[#3156D3] focus:outline-none"
                    />
                  </FormField>
                </div>
              </div>

              <FormField
                id="new-lesson-desc"
                label="Lesson Introduction & Content (Markdown Supported)"
                helperText="Author the introduction, conceptual notes, and objectives. Students see this directly on their lesson workspace."
              >
                <textarea
                  id="new-lesson-desc"
                  rows={5}
                  value={newLessonDesc}
                  onChange={(e) => setNewLessonDesc(e.target.value)}
                  placeholder="Write the lesson introduction, core architectural invariants, and instructional notes (supports Markdown)..."
                  className="w-full bg-white dark:bg-[#1E232E] border border-[#D9DEE7] dark:border-gray-700 text-sm rounded-lg px-3.5 py-2.5 focus:border-[#3156D3] focus:outline-none font-sans"
                />
              </FormField>

              <div className="pt-3 border-t border-gray-200 dark:border-gray-800 dark:border-gray-800 dark:border-gray-800 dark:border-gray-800 flex items-center justify-end gap-2.5">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setAddLessonTopic(null)}
                  disabled={isSubmittingNewLesson}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  leftIcon={<Save className="w-4 h-4" />}
                  disabled={isSubmittingNewLesson || !newLessonTitle.trim()}
                >
                  {isSubmittingNewLesson ? 'Creating Lesson...' : 'Create Lesson'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
