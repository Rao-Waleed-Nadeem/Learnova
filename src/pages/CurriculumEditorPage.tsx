import React, { useState } from 'react';
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
} from 'lucide-react';
import { PageHeader } from '../components/ui/PageHeader';
import { Button } from '../components/ui/Button';
import { FormField } from '../components/ui/FormField';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { Course, Topic, Lesson, LearningResource } from '../types';

interface CurriculumEditorPageProps {
  course: Course;
  topics: Topic[];
  lessons: Lesson[];
  resources: LearningResource[];
  onNavigate: (page: string, params?: Record<string, string>) => void;
  onSaveTopic: (topic: Topic) => void;
  onDeleteTopic: (id: string) => void;
  onSaveLesson: (lesson: Lesson) => void;
  onDeleteLesson: (id: string) => void;
  onNotify: (type: 'success' | 'error' | 'info', msg: string) => void;
}

export const CurriculumEditorPage: React.FC<CurriculumEditorPageProps> = ({
  course,
  topics,
  lessons,
  resources,
  onNavigate,
  onSaveTopic,
  onDeleteTopic,
  onSaveLesson,
  onDeleteLesson,
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

  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // Deletion modals
  const [confirmDeleteTopic, setConfirmDeleteTopic] = useState<Topic | null>(null);
  const [confirmDeleteLesson, setConfirmDeleteLesson] = useState<Lesson | null>(null);

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
    setHasUnsavedChanges(false);
  };

  const toggleExpand = (topicId: string) => {
    setExpandedTopics((prev) => ({ ...prev, [topicId]: !prev[topicId] }));
  };

  // Add Topic
  const handleAddTopic = () => {
    const newTopic: Topic = {
      id: `topic-${Date.now()}`,
      courseId: course.id,
      title: `Topic ${sortedTopics.length + 1}: New Curriculum Unit`,
      description: 'Topic syllabus summary and objectives.',
      order: sortedTopics.length + 1,
      prerequisiteTopicIds: [],
      masteryThreshold: 75,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    onSaveTopic(newTopic);
    setSelectedType('topic');
    setSelectedId(newTopic.id);
    setTopicTitle(newTopic.title);
    setTopicDesc(newTopic.description);
    setTopicThreshold(newTopic.masteryThreshold);
    setExpandedTopics((prev) => ({ ...prev, [newTopic.id]: true }));
    onNotify('success', 'New topic created.');
  };

  // Add Lesson to current topic
  const handleAddLesson = (targetTopicId: string) => {
    const topicLessons = lessons.filter((l) => l.topicId === targetTopicId);
    const newLesson: Lesson = {
      id: `lesson-${Date.now()}`,
      topicId: targetTopicId,
      courseId: course.id,
      title: `Lesson ${topicLessons.length + 1}: New Lesson`,
      description: 'Specific learning objective or instructional exercise.',
      order: topicLessons.length + 1,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    onSaveLesson(newLesson);
    setSelectedType('lesson');
    setSelectedId(newLesson.id);
    setLessonTitle(newLesson.title);
    setLessonDesc(newLesson.description);
    setExpandedTopics((prev) => ({ ...prev, [targetTopicId]: true }));
    onNotify('success', 'New lesson added under topic.');
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
              <span className="flex items-center gap-1.5 text-xs text-[#946200] font-semibold bg-[#FFF5D6] px-2.5 py-1 rounded border border-[#946200]/30 animate-pulse">
                <AlertCircle className="w-3.5 h-3.5" />
                Unsaved changes
              </span>
            ) : (
              <span className="flex items-center gap-1.5 text-xs text-[#18794E] font-medium bg-[#EAF7F0] px-2.5 py-1 rounded border border-[#18794E]/20">
                <CheckCircle2 className="w-3.5 h-3.5" />
                All changes saved
              </span>
            )}
            <Button
              variant="primary"
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
        <div className="lg:col-span-4 bg-white rounded-xl border border-[#D9DEE7] p-4 shadow-2xs flex flex-col gap-3">
          <div className="flex items-center justify-between pb-3 border-b border-[#D9DEE7]">
            <div className="flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-[#3156D3]" />
              <h2 className="text-sm font-bold text-[#1F2937]">Curriculum Tree</h2>
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
            <div className="text-center py-8 px-4 text-[#5B6472]">
              <Layers className="w-8 h-8 text-gray-400 mx-auto mb-2" />
              <p className="text-xs font-semibold text-[#1F2937]">No topics added yet</p>
              <p className="text-xs text-[#5B6472] mt-1 mb-4">
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
                const isSelected = selectedType === 'topic' && selectedId === t.id;
                const isExpanded = !!expandedTopics[t.id];

                return (
                  <div key={t.id} className="rounded-lg border border-[#D9DEE7] overflow-hidden bg-white">
                    {/* Topic Row */}
                    <div
                      className={`flex items-center justify-between p-2.5 transition-colors cursor-pointer select-none ${
                        isSelected
                          ? 'bg-[#E8EEFF] border-l-4 border-l-[#3156D3] text-[#2646B8] font-semibold'
                          : 'hover:bg-gray-50 text-[#1F2937]'
                      }`}
                      onClick={() => selectTopicNode(t)}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleExpand(t.id);
                          }}
                          className="p-1 hover:bg-black/5 rounded text-[#737D8C] cursor-pointer"
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
                          className="p-1 text-[#737D8C] hover:text-[#1F2937] disabled:opacity-30 cursor-pointer"
                          title="Move up"
                          aria-label={`Move topic ${t.title} up`}
                        >
                          <ArrowUp className="w-3 h-3" />
                        </button>
                        <button
                          disabled={idx === sortedTopics.length - 1}
                          onClick={() => handleMoveTopic(idx, 'down')}
                          className="p-1 text-[#737D8C] hover:text-[#1F2937] disabled:opacity-30 cursor-pointer"
                          title="Move down"
                          aria-label={`Move topic ${t.title} down`}
                        >
                          <ArrowDown className="w-3 h-3" />
                        </button>
                        <button
                          onClick={() => handleAddLesson(t.id)}
                          className="p-1 text-[#3156D3] hover:bg-[#E8EEFF] rounded cursor-pointer ml-1"
                          title="Add lesson to this topic"
                          aria-label={`Add lesson to topic ${t.title}`}
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Lessons list under this topic */}
                    {isExpanded && (
                      <div className="bg-[#F5F7FA] border-t border-[#D9DEE7] divide-y divide-gray-100 pl-6 pr-2 py-1">
                        {topicLessons.length === 0 ? (
                          <div className="py-2 text-[11px] text-[#737D8C] flex items-center justify-between">
                            <span>No lessons yet</span>
                            <button
                              onClick={() => handleAddLesson(t.id)}
                              className="text-[#3156D3] font-semibold hover:underline cursor-pointer"
                            >
                              + Add lesson
                            </button>
                          </div>
                        ) : (
                          topicLessons.map((l) => {
                            const isLessonSelected = selectedType === 'lesson' && selectedId === l.id;
                            const resCount = resources.filter((r) => r.lessonId === l.id).length;

                            return (
                              <div
                                key={l.id}
                                onClick={() => selectLessonNode(l)}
                                className={`py-1.5 px-2.5 my-0.5 rounded flex items-center justify-between text-xs transition-colors cursor-pointer ${
                                  isLessonSelected
                                    ? 'bg-[#E8EEFF] text-[#2646B8] font-semibold'
                                    : 'hover:bg-white text-[#5B6472]'
                                }`}
                              >
                                <div className="flex items-center gap-2 truncate">
                                  <FileText className="w-3.5 h-3.5 shrink-0" />
                                  <span className="truncate">{l.title}</span>
                                </div>
                                <span className="text-[10px] text-[#737D8C] shrink-0 bg-white px-1.5 py-0.5 rounded border border-gray-200">
                                  {resCount} res
                                </span>
                              </div>
                            );
                          })
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right Pane: Selected Node Editor (65%) */}
        <div className="lg:col-span-8 bg-white rounded-xl border border-[#D9DEE7] p-6 shadow-2xs">
          {selectedType === 'topic' && currentTopic ? (
            <div className="space-y-6">
              <div className="flex items-center justify-between pb-4 border-b border-[#D9DEE7]">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold bg-[#E8EEFF] text-[#2646B8] px-2 py-0.5 rounded">
                      Topic #{currentTopic.order}
                    </span>
                    <h2 className="text-lg font-bold text-[#1F2937]">{currentTopic.title}</h2>
                  </div>
                  <p className="text-xs text-[#5B6472] mt-0.5">
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
                    className="w-full bg-white border border-[#D9DEE7] text-sm rounded-lg px-3.5 py-2.5 focus:border-[#3156D3] focus:outline-none"
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
                    className="w-full bg-white border border-[#D9DEE7] text-sm rounded-lg px-3.5 py-2.5 focus:border-[#3156D3] focus:outline-none"
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
                      className="w-full bg-white border border-[#D9DEE7] text-sm rounded-lg px-3.5 py-2 focus:border-[#3156D3] focus:outline-none"
                    />
                  </FormField>

                  <div className="p-3 rounded-lg bg-gray-50 border border-gray-200 flex flex-col justify-between">
                    <div>
                      <span className="text-xs font-semibold text-[#1F2937]">Prerequisite Status</span>
                      <p className="text-xs text-[#5B6472] mt-0.5">
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

                <div className="pt-4 border-t border-[#D9DEE7] flex items-center justify-between">
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    leftIcon={<Plus className="w-3.5 h-3.5" />}
                    onClick={() => handleAddLesson(currentTopic.id)}
                  >
                    Add lesson under this topic
                  </Button>
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
              <div className="flex items-center justify-between pb-4 border-b border-[#D9DEE7]">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold bg-[#EFF8FF] text-[#175CD3] px-2 py-0.5 rounded">
                      Lesson #{currentLesson.order}
                    </span>
                    <h2 className="text-lg font-bold text-[#1F2937]">{currentLesson.title}</h2>
                  </div>
                  <p className="text-xs text-[#5B6472] mt-0.5">
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
                    className="w-full bg-white border border-[#D9DEE7] text-sm rounded-lg px-3.5 py-2.5 focus:border-[#3156D3] focus:outline-none"
                  />
                </FormField>

                <FormField
                  id="lesson-desc-input"
                  label="Learning objective / Instructional notes"
                  helperText="Describe what learners should understand upon completing this lesson."
                >
                  <textarea
                    id="lesson-desc-input"
                    rows={3}
                    value={lessonDesc}
                    onChange={(e) => {
                      setLessonDesc(e.target.value);
                      setHasUnsavedChanges(true);
                    }}
                    className="w-full bg-white border border-[#D9DEE7] text-sm rounded-lg px-3.5 py-2.5 focus:border-[#3156D3] focus:outline-none"
                  />
                </FormField>

                {/* Attached resources summary */}
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-semibold text-[#1F2937]">
                      Attached Learning Resources ({resources.filter((r) => r.lessonId === currentLesson.id).length})
                    </span>
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
                      + Add resource
                    </button>
                  </div>
                  {resources.filter((r) => r.lessonId === currentLesson.id).length === 0 ? (
                    <p className="text-xs text-[#737D8C]">
                      No documents, videos, or code attached to this lesson yet.
                    </p>
                  ) : (
                    <div className="space-y-1.5 mt-2">
                      {resources
                        .filter((r) => r.lessonId === currentLesson.id)
                        .map((res) => (
                          <div
                            key={res.id}
                            className="bg-white p-2 rounded border border-gray-200 text-xs flex items-center justify-between"
                          >
                            <span className="font-medium text-[#1F2937] truncate">{res.title}</span>
                            <span className="text-[10px] uppercase font-semibold text-[#3156D3] bg-[#E8EEFF] px-2 py-0.5 rounded">
                              {res.type}
                            </span>
                          </div>
                        ))}
                    </div>
                  )}
                </div>

                <div className="pt-4 border-t border-[#D9DEE7] flex justify-end">
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
            <div className="text-center py-16 text-[#5B6472]">
              <Layers className="w-10 h-10 text-gray-300 mx-auto mb-2" />
              <p className="text-sm font-semibold text-[#1F2937]">Select a topic or lesson</p>
              <p className="text-xs text-[#5B6472] mt-1">
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
    </div>
  );
};
