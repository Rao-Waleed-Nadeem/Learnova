import React, { useState } from 'react';
import {
  Check,
  ChevronRight,
  ChevronLeft,
  ChevronDown,
  ChevronUp,
  Save,
  UploadCloud,
  CheckCircle2,
  AlertCircle,
  Clock,
  ListFilter,
  Eye,
  ArrowLeft,
  ArrowRight,
  X,
  FileCheck,
  Trash2,
  Search,
  Filter,
  Info,
} from 'lucide-react';
import { PageHeader } from '../../components/ui/PageHeader';
import { Button } from '../../components/ui/Button';
import { FormField } from '../../components/ui/FormField';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { Assessment, Course, Topic, QuestionData, AssessmentType, AssessmentStatus } from '../../types';
import { calculateAssessmentTotalPoints } from '../../utils/assessment';

interface AssessmentEditorPageProps {
  initialAssessment?: Assessment;
  courses: Course[];
  topics: Topic[];
  questions: QuestionData[];
  onNavigate: (page: string, params?: Record<string, string>) => void;
  onSaveAssessment: (a: Assessment) => void;
  onNotify: (type: 'success' | 'error' | 'info', msg: string) => void;
}

export const AssessmentEditorPage: React.FC<AssessmentEditorPageProps> = ({
  initialAssessment,
  courses,
  topics,
  questions,
  onNavigate,
  onSaveAssessment,
  onNotify,
}) => {
  const isEditing = !!initialAssessment;

  // 4 steps: 1 Details, 2 Questions, 3 Settings, 4 Preview & Publish
  const [currentStep, setCurrentStep] = useState<number>(1);

  // Step 1: Details
  const [title, setTitle] = useState(initialAssessment?.title || '');
  const [courseId, setCourseId] = useState(
    initialAssessment?.courseId || (courses[0]?.id ?? '')
  );
  const courseTopics = topics.filter((t) => t.courseId === courseId);
  const [topicId, setTopicId] = useState(
    initialAssessment?.topicId || (courseTopics[0]?.id ?? '')
  );
  const [type, setType] = useState<AssessmentType>(
    initialAssessment?.type || 'summative'
  );
  const [instructions, setInstructions] = useState(
    initialAssessment?.instructions || ''
  );

  // Step 2: Questions selection and advanced filtering state
  const [selectedQuestionIds, setSelectedQuestionIds] = useState<string[]>(
    initialAssessment?.questionIds || []
  );
  const [qSearch, setQSearch] = useState('');
  const [selectedTopicFilter, setSelectedTopicFilter] = useState<string>('all');
  const [selectedTypeFilter, setSelectedTypeFilter] = useState<string>('all');
  const [selectedDifficultyFilter, setSelectedDifficultyFilter] = useState<string>('all');
  const [onlySelected, setOnlySelected] = useState<boolean>(false);
  const [expandedQuestionIds, setExpandedQuestionIds] = useState<Record<string, boolean>>({});

  const toggleExpandQuestion = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setExpandedQuestionIds((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const expandAllFiltered = () => {
    const next: Record<string, boolean> = {};
    availableQuestions.forEach((q) => {
      next[q.id] = true;
    });
    setExpandedQuestionIds(next);
  };

  const collapseAll = () => {
    setExpandedQuestionIds({});
  };

  // Step 3: Settings
  const [timeLimit, setTimeLimit] = useState<number>(
    initialAssessment?.timeLimitMinutes || 30
  );
  const [maxAttempts, setMaxAttempts] = useState<number>(
    initialAssessment?.maxAttempts || 2
  );
  const [passingScore, setPassingScore] = useState<number>(
    initialAssessment?.passingScorePercent || 70
  );
  const [scheduleDate, setScheduleDate] = useState<string>(
    initialAssessment?.scheduleDate || ''
  );

  // Status & Dialogs
  const [status, setStatus] = useState<AssessmentStatus>(
    initialAssessment?.status || 'draft'
  );
  const [stepErrors, setStepErrors] = useState<Record<string, string>>({});

  // Filter available questions: approved questions in this course with topic/type/difficulty/search filters
  const availableQuestions = questions.filter((q) => {
    const matchesCourse = q.courseId === courseId;
    const matchesApproved = q.status === 'approved';
    const matchesTopic =
      selectedTopicFilter === 'all' || q.topicId === selectedTopicFilter;
    const matchesType =
      selectedTypeFilter === 'all' || q.type === selectedTypeFilter;
    const matchesDifficulty =
      selectedDifficultyFilter === 'all' || q.difficulty === selectedDifficultyFilter;
    const matchesOnlySelected = !onlySelected || selectedQuestionIds.includes(q.id);

    const searchLower = qSearch.trim().toLowerCase();
    const matchesSearch =
      !searchLower ||
      q.prompt.toLowerCase().includes(searchLower) ||
      q.type.toLowerCase().includes(searchLower) ||
      (q.explanation && q.explanation.toLowerCase().includes(searchLower)) ||
      (q.options && q.options.some((opt) => opt.text.toLowerCase().includes(searchLower)));

    return (
      matchesCourse &&
      matchesApproved &&
      matchesTopic &&
      matchesType &&
      matchesDifficulty &&
      matchesOnlySelected &&
      matchesSearch
    );
  });

  const handleSelectAllFiltered = () => {
    const idsToAdd = availableQuestions.map((q) => q.id);
    const combined = Array.from(new Set([...selectedQuestionIds, ...idsToAdd]));
    setSelectedQuestionIds(combined);
    if (stepErrors.questions) {
      setStepErrors({ ...stepErrors, questions: '' });
    }
  };

  const handleClearSelection = () => {
    setSelectedQuestionIds([]);
  };

  const selectedQuestions = questions.filter((q) =>
    selectedQuestionIds.includes(q.id)
  );
  const totalPoints = calculateAssessmentTotalPoints(selectedQuestions);

  // Step validation
  const validateCurrentStep = (step: number): boolean => {
    const errors: Record<string, string> = {};
    if (step === 1) {
      if (!title.trim()) errors.title = 'Assessment title is required.';
      if (!courseId) errors.courseId = 'Course must be selected.';
      if (!topicId) errors.topicId = 'Topic must be selected.';
      if (!instructions.trim()) errors.instructions = 'Instructions for students are required.';
    } else if (step === 2) {
      if (selectedQuestionIds.length === 0) {
        errors.questions = 'Select at least one approved question for this assessment.';
      }
    }
    setStepErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleNextStep = () => {
    if (validateCurrentStep(currentStep)) {
      setCurrentStep((prev) => Math.min(prev + 1, 4));
    }
  };

  const handlePrevStep = () => {
    setStepErrors({});
    setCurrentStep((prev) => Math.max(prev - 1, 1));
  };

  const handleToggleQuestion = (id: string) => {
    if (selectedQuestionIds.includes(id)) {
      setSelectedQuestionIds(selectedQuestionIds.filter((qid) => qid !== id));
    } else {
      setSelectedQuestionIds([...selectedQuestionIds, id]);
    }
    if (stepErrors.questions) {
      setStepErrors({ ...stepErrors, questions: '' });
    }
  };

  const handleSaveDraft = () => {
    if (!title.trim()) {
      onNotify('error', 'Assessment title is required to save a draft.');
      return;
    }
    const toSave: Assessment = {
      id: initialAssessment ? initialAssessment.id : `asm-${Date.now()}`,
      courseId,
      topicId,
      title: title.trim(),
      type,
      instructions: instructions.trim(),
      questionIds: selectedQuestionIds,
      timeLimitMinutes: timeLimit,
      maxAttempts,
      passingScorePercent: passingScore,
      scheduleDate: scheduleDate || undefined,
      status: 'draft',
      updatedAt: new Date().toISOString(),
      createdAt: initialAssessment ? initialAssessment.createdAt : new Date().toISOString(),
    };

    onSaveAssessment(toSave);
    setStatus('draft');
    onNotify('success', 'Assessment draft saved successfully.');
    onNavigate('assessments');
  };

  const handleConfirmPublish = () => {
    if (!title.trim()) {
      onNotify('error', 'Please provide an assessment title before publishing.');
      setStep(1);
      return;
    }
    if (selectedQuestionIds.length === 0) {
      onNotify('error', 'Cannot publish an assessment with zero questions.');
      setStep(2);
      return;
    }

    const toPublish: Assessment = {
      id: initialAssessment ? initialAssessment.id : `asm-${Date.now()}`,
      courseId,
      topicId,
      title: title.trim(),
      type,
      instructions: instructions.trim(),
      questionIds: selectedQuestionIds,
      timeLimitMinutes: timeLimit,
      maxAttempts,
      passingScorePercent: passingScore,
      scheduleDate: scheduleDate || undefined,
      status: 'published',
      updatedAt: new Date().toISOString(),
      createdAt: initialAssessment ? initialAssessment.createdAt : new Date().toISOString(),
    };

    onSaveAssessment(toPublish);
    setStatus('published');
    onNotify('success', 'Assessment published live to students.');
    onNavigate('assessments');
  };

  const steps = [
    { num: 1, label: 'Details' },
    { num: 2, label: 'Questions' },
    { num: 3, label: 'Settings' },
    { num: 4, label: 'Preview & Publish' },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        breadcrumbs={[
          { label: 'Assessments', onClick: () => onNavigate('assessments') },
          { label: isEditing ? initialAssessment?.title || 'Edit' : 'Create Assessment', active: true },
        ]}
        title={isEditing ? 'Assessment Builder: Edit' : 'Assessment Builder'}
        description="Configure evaluation type, select curated questions, define timing constraints, and publish to students."
        status={status}
        primaryAction={
          <div className="flex items-center gap-2">
            <Button variant="secondary" size="sm" onClick={handleSaveDraft}>
              Save draft
            </Button>
            {currentStep === 4 ? (
              <Button
                variant="primary"
                leftIcon={<UploadCloud className="w-4 h-4" />}
                onClick={handleConfirmPublish}
              >
                Publish assessment
              </Button>
            ) : (
              <Button
                variant="primary"
                size="sm"
                rightIcon={<ChevronRight className="w-4 h-4" />}
                onClick={handleNextStep}
              >
                Next step
              </Button>
            )}
          </div>
        }
      />

      {/* Persistent Summary Bar */}
      <div className="bg-white dark:bg-[#181C24] rounded-xl border border-[#D9DEE7] dark:border-[#2D3545] p-4 shadow-2xs flex flex-wrap items-center justify-between gap-4 text-xs">
        <div className="flex items-center gap-4 flex-wrap">
          <div>
            <span className="text-[#737D8C] dark:text-gray-400 block uppercase font-semibold text-[10px]">Title</span>
            <span className="font-bold text-[#1F2937] dark:text-white text-sm">{title || 'Untitled Assessment'}</span>
          </div>
          <div className="w-px h-6 bg-gray-200 dark:bg-gray-700 hidden sm:block" />
          <div>
            <span className="text-[#737D8C] dark:text-gray-400 block uppercase font-semibold text-[10px]">Type</span>
            <span className="capitalize font-semibold text-[#3156D3] dark:text-indigo-300 bg-[#E8EEFF] dark:bg-indigo-950/40 px-2 py-0.5 rounded">
              {type}
            </span>
          </div>
          <div className="w-px h-6 bg-gray-200 dark:bg-gray-700 hidden sm:block" />
          <div>
            <span className="text-[#737D8C] dark:text-gray-400 block uppercase font-semibold text-[10px]">Questions</span>
            <span className="font-semibold text-[#1F2937] dark:text-gray-200 dark:text-gray-200 dark:text-gray-200 dark:text-gray-200">{selectedQuestionIds.length} chosen</span>
          </div>
          <div className="w-px h-6 bg-gray-200 dark:bg-gray-700 hidden sm:block" />
          <div>
            <span className="text-[#737D8C] dark:text-gray-400 block uppercase font-semibold text-[10px]">Total Points</span>
            <span className="font-bold text-[#18794E]">{totalPoints} pts</span>
          </div>
        </div>

        <button
          onClick={() => onNavigate('assessments')}
          className="text-xs text-[#5B6472] dark:text-gray-400 hover:text-[#1F2937] dark:hover:text-white flex items-center gap-1 cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Exit to list</span>
        </button>
      </div>

      {/* 4-Step Progress Header */}
      <div className="bg-white dark:bg-[#181C24] rounded-xl border border-[#D9DEE7] dark:border-[#2D3545] p-4 shadow-2xs">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2">
          {steps.map((st) => {
            const isCompleted = currentStep > st.num;
            const isCurrent = currentStep === st.num;

            return (
              <button
                key={st.num}
                type="button"
                onClick={() => {
                  if (st.num < currentStep || validateCurrentStep(currentStep)) {
                    setCurrentStep(st.num);
                  }
                }}
                className={`flex items-center gap-3 p-3 rounded-lg text-left transition-colors cursor-pointer ${
                  isCurrent
                    ? 'bg-[#E8EEFF] border border-[#3156D3]/40'
                    : isCompleted
                    ? 'bg-gray-50 dark:bg-[#1C212B] border border-gray-200 dark:border-gray-800 text-[#1F2937] dark:text-gray-200'
                    : 'text-[#737D8C] dark:text-gray-500 border border-transparent opacity-60'
                }`}
              >
                <div
                  className={`w-6 h-6 rounded-full flex items-center justify-center font-bold text-xs shrink-0 ${
                    isCurrent
                      ? 'bg-[#3156D3] text-white'
                      : isCompleted
                      ? 'bg-[#18794E] text-white'
                      : 'bg-gray-200 text-gray-700'
                  }`}
                >
                  {isCompleted ? <Check className="w-3.5 h-3.5" /> : st.num}
                </div>
                <div>
                  <span className="text-[10px] uppercase font-semibold block text-[#737D8C] dark:text-gray-400">
                    Step {st.num}
                  </span>
                  <span className={`text-xs font-bold ${isCurrent ? 'text-[#2646B8] dark:text-indigo-400' : 'text-[#1F2937] dark:text-gray-200'}`}>
                    {st.label}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Step 1: Details */}
      {currentStep === 1 && (
        <div className="bg-white dark:bg-[#181C24] rounded-xl border border-[#D9DEE7] dark:border-[#2D3545] p-6 shadow-2xs space-y-5 max-w-3xl">
          <h2 className="text-base font-bold text-[#1F2937] dark:text-white pb-2 border-b border-[#D9DEE7] dark:border-[#2D3545]">
            Step 1: Assessment Details &amp; Objectives
          </h2>

          <FormField id="asm-title" label="Assessment Title" required error={stepErrors.title}>
            <input
              id="asm-title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., Midterm Evaluation: Core Programming Constructs"
              className="w-full bg-white dark:bg-[#1E232E] border border-[#D9DEE7] dark:border-gray-700 text-sm text-gray-900 dark:text-white rounded-lg px-3.5 py-2.5 focus:border-[#3156D3] focus:outline-none"
            />
          </FormField>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormField id="asm-course" label="Course" required error={stepErrors.courseId}>
              <select
                id="asm-course"
                value={courseId}
                onChange={(e) => {
                  setCourseId(e.target.value);
                  const tList = topics.filter((t) => t.courseId === e.target.value);
                  if (tList.length > 0) setTopicId(tList[0].id);
                }}
                className="w-full bg-white dark:bg-[#1E232E] border border-[#D9DEE7] dark:border-gray-700 text-sm text-gray-900 dark:text-white rounded-lg px-3.5 py-2.5 focus:border-[#3156D3] focus:outline-none"
              >
                {courses.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.title}
                  </option>
                ))}
              </select>
            </FormField>

            <FormField id="asm-topic" label="Curriculum Topic" required error={stepErrors.topicId}>
              <select
                id="asm-topic"
                value={topicId}
                onChange={(e) => setTopicId(e.target.value)}
                className="w-full bg-white dark:bg-[#1E232E] border border-[#D9DEE7] dark:border-gray-700 text-sm text-gray-900 dark:text-white rounded-lg px-3.5 py-2.5 focus:border-[#3156D3] focus:outline-none"
              >
                {courseTopics.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.title}
                  </option>
                ))}
              </select>
            </FormField>
          </div>

          <FormField
            id="asm-type"
            label="Assessment Type"
            helperText="Diagnostic identifies gaps before starting; Formative supports learning; Summative awards academic mastery score."
          >
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {(['diagnostic', 'formative', 'summative'] as AssessmentType[]).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setType(t)}
                  className={`p-3 rounded-xl border text-xs font-semibold capitalize text-center transition-all cursor-pointer ${
                    type === t
                      ? 'bg-[#E8EEFF] border-[#3156D3] text-[#2646B8] shadow-xs'
                      : 'bg-white dark:bg-[#1E232E] border-[#D9DEE7] dark:border-gray-700 text-[#5B6472] dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800'
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </FormField>

          <FormField
            id="asm-instructions"
            label="Instructions for Students"
            required
            error={stepErrors.instructions}
            helperText="Displayed to students before starting the test."
          >
            <textarea
              id="asm-instructions"
              rows={3}
              value={instructions}
              onChange={(e) => setInstructions(e.target.value)}
              placeholder="Read each question carefully. Select the best answer. You will have 30 minutes to complete."
              className="w-full bg-white dark:bg-[#1E232E] border border-[#D9DEE7] dark:border-gray-700 text-sm text-gray-900 dark:text-white rounded-lg px-3.5 py-2.5 focus:border-[#3156D3] focus:outline-none"
            />
          </FormField>

          <div className="pt-4 border-t border-[#D9DEE7] dark:border-[#2D3545] flex justify-end">
            <Button variant="primary" rightIcon={<ChevronRight className="w-4 h-4" />} onClick={handleNextStep}>
              Next: Select questions
            </Button>
          </div>
        </div>
      )}

      {/* Step 2: Questions */}
      {currentStep === 2 && (
        <div className="bg-white dark:bg-[#181C24] rounded-xl border border-[#D9DEE7] dark:border-[#2D3545] p-6 shadow-2xs space-y-5">
          <div className="flex flex-wrap items-center justify-between pb-3 border-b border-[#D9DEE7] dark:border-[#2D3545] gap-3">
            <div>
              <h2 className="text-base font-bold text-[#1F2937] dark:text-white">Step 2: Select Questions</h2>
              <p className="text-xs text-[#5B6472] dark:text-gray-400 mt-0.5">
                Inspect question prompts, answer choices, and pedagogical explanations to assemble your assessment.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold bg-[#E8EEFF] text-[#2646B8] px-3 py-1 rounded-full border border-indigo-200">
                {selectedQuestionIds.length} Selected ({totalPoints} Points)
              </span>
            </div>
          </div>

          {stepErrors.questions && (
            <div className="p-3 rounded-lg bg-[#FEF0EF] text-xs text-[#B42318] border border-[#B42318]/30 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{stepErrors.questions}</span>
            </div>
          )}

          {/* Filtering and Search Controls */}
          <div className="space-y-3 bg-gray-50/80 dark:bg-[#1C212B]/80 p-4 rounded-xl border border-gray-200 dark:border-gray-800">
            {/* Search and Only Selected toggle */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="search"
                  value={qSearch}
                  onChange={(e) => setQSearch(e.target.value)}
                  placeholder="Search questions by prompt, answer choices, or explanation..."
                  className="w-full bg-white dark:bg-[#1E232E] border border-[#D9DEE7] dark:border-gray-700 text-xs text-gray-900 dark:text-white rounded-lg pl-9 pr-3.5 py-2 focus:border-[#3156D3] focus:outline-none"
                />
              </div>
              <label className="flex items-center gap-2 text-xs font-semibold text-gray-700 dark:text-gray-300 cursor-pointer select-none shrink-0 bg-white dark:bg-[#1E232E] px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700">
                <input
                  type="checkbox"
                  checked={onlySelected}
                  onChange={(e) => setOnlySelected(e.target.checked)}
                  className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                />
                <span>Only show selected ({selectedQuestionIds.length})</span>
              </label>
            </div>

            {/* Filter Dropdowns and Pills */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
              <div>
                <label className="text-[11px] font-bold uppercase text-gray-500 block mb-1">Topic</label>
                <select
                  value={selectedTopicFilter}
                  onChange={(e) => setSelectedTopicFilter(e.target.value)}
                  className="w-full bg-white dark:bg-[#1E232E] border border-gray-200 dark:border-gray-700 text-xs text-gray-900 dark:text-white rounded-lg px-2.5 py-1.5 focus:border-[#3156D3] focus:outline-none"
                >
                  <option value="all">All Course Topics</option>
                  {courseTopics.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.title}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[11px] font-bold uppercase text-gray-500 block mb-1">Question Type</label>
                <select
                  value={selectedTypeFilter}
                  onChange={(e) => setSelectedTypeFilter(e.target.value)}
                  className="w-full bg-white dark:bg-[#1E232E] border border-gray-200 dark:border-gray-700 text-xs text-gray-900 dark:text-white rounded-lg px-2.5 py-1.5 focus:border-[#3156D3] focus:outline-none capitalize"
                >
                  <option value="all">All Types</option>
                  <option value="multiple_choice">Multiple Choice</option>
                  <option value="true_false">True / False</option>
                  <option value="fill_blank">Fill in Blank</option>
                  <option value="matching">Matching</option>
                  <option value="short_answer">Short Answer</option>
                </select>
              </div>

              <div>
                <label className="text-[11px] font-bold uppercase text-gray-500 block mb-1">Difficulty</label>
                <select
                  value={selectedDifficultyFilter}
                  onChange={(e) => setSelectedDifficultyFilter(e.target.value)}
                  className="w-full bg-white dark:bg-[#1E232E] border border-gray-200 dark:border-gray-700 text-xs text-gray-900 dark:text-white rounded-lg px-2.5 py-1.5 focus:border-[#3156D3] focus:outline-none capitalize"
                >
                  <option value="all">All Difficulties</option>
                  <option value="easy">Easy</option>
                  <option value="medium">Medium</option>
                  <option value="hard">Hard</option>
                </select>
              </div>
            </div>

            {/* Bulk Action Bar */}
            <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-gray-200 dark:border-gray-800 text-xs">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleSelectAllFiltered}
                  className="text-indigo-600 hover:text-indigo-800 font-semibold cursor-pointer"
                >
                  Select All Filtered ({availableQuestions.length})
                </button>
                <span className="text-gray-300">|</span>
                <button
                  type="button"
                  onClick={handleClearSelection}
                  className="text-gray-500 hover:text-red-600 font-semibold cursor-pointer"
                >
                  Clear Selection
                </button>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={expandAllFiltered}
                  className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white font-medium cursor-pointer"
                >
                  Expand All Details
                </button>
                <span className="text-gray-300">|</span>
                <button
                  type="button"
                  onClick={collapseAll}
                  className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white font-medium cursor-pointer"
                >
                  Collapse All
                </button>
              </div>
            </div>
          </div>

          {/* Question List */}
          {availableQuestions.length === 0 ? (
            <div className="text-center py-12 text-[#5B6472] dark:text-gray-400 text-xs">
              <p className="font-semibold text-[#1F2937] dark:text-gray-200 dark:text-gray-200 dark:text-gray-200 dark:text-gray-200">No questions match current filters</p>
              <p className="mt-1">
                Try resetting search, topic, type, or difficulty filters.
              </p>
              <div className="flex items-center justify-center gap-2 mt-3">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => {
                    setQSearch('');
                    setSelectedTopicFilter('all');
                    setSelectedTypeFilter('all');
                    setSelectedDifficultyFilter('all');
                    setOnlySelected(false);
                  }}
                >
                  Reset all filters
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onNavigate('question_editor')}
                >
                  Create new question
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-3 max-h-[600px] overflow-y-auto pr-1">
              {availableQuestions.map((q) => {
                const isSelected = selectedQuestionIds.includes(q.id);
                const isExpanded = !!expandedQuestionIds[q.id];
                const topicName = courseTopics.find((t) => t.id === q.topicId)?.title;

                return (
                  <div
                    key={q.id}
                    className={`rounded-xl border p-4 transition-all ${
                      isSelected
                        ? 'bg-indigo-50/30 dark:bg-indigo-950/30 border-indigo-300 dark:border-indigo-700 ring-1 ring-indigo-200 dark:ring-indigo-800'
                        : 'bg-white dark:bg-[#181C24] border-gray-200 dark:border-gray-800 hover:border-gray-300 dark:hover:border-gray-700 hover:shadow-xs'
                    }`}
                  >
                    {/* Top Row: Checkbox, Badges, Expand Toggle */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3 flex-1 min-w-0">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleToggleQuestion(q.id)}
                          className="w-4 h-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 mt-1 cursor-pointer shrink-0"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <span className="text-[11px] font-semibold text-indigo-700 bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded capitalize">
                              {q.type.replace('_', ' ')}
                            </span>
                            <span
                              className={`text-[10px] font-bold px-2 py-0.5 rounded capitalize ${
                                q.difficulty === 'easy'
                                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                  : q.difficulty === 'medium'
                                  ? 'bg-sky-50 text-sky-700 border border-sky-200'
                                  : 'bg-purple-50 text-purple-700 border border-purple-200'
                              }`}
                            >
                              {q.difficulty}
                            </span>
                            <span className="text-[11px] text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded">
                              {q.points || 1} pts
                            </span>
                            {topicName && (
                              <span className="text-[11px] text-gray-600 dark:text-gray-300 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 px-2 py-0.5 rounded truncate max-w-xs">
                                {topicName}
                              </span>
                            )}
                          </div>

                          {/* Full Question Prompt */}
                          <div
                            onClick={() => handleToggleQuestion(q.id)}
                            className="mt-2 text-sm font-medium text-gray-900 dark:text-white cursor-pointer select-none leading-relaxed"
                          >
                            {q.prompt}
                          </div>
                        </div>
                      </div>

                      {/* Expand / Details Toggle Button */}
                      <button
                        type="button"
                        onClick={(e) => toggleExpandQuestion(q.id, e)}
                        className="text-xs text-indigo-600 hover:text-indigo-800 font-semibold flex items-center gap-1 shrink-0 p-1 rounded hover:bg-indigo-50/60 cursor-pointer"
                      >
                        <span>{isExpanded ? 'Hide Details' : 'Inspect Details'}</span>
                        {isExpanded ? (
                          <ChevronUp className="w-3.5 h-3.5" />
                        ) : (
                          <ChevronDown className="w-3.5 h-3.5" />
                        )}
                      </button>
                    </div>

                    {/* Expandable Question Inspector Panel */}
                    {isExpanded && (
                      <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-800 pl-7 space-y-3 bg-gray-50/60 dark:bg-[#1C212B]/60 p-3.5 rounded-lg border border-gray-200 dark:border-gray-800">
                        {/* Multiple Choice Options */}
                        {q.type === 'multiple_choice' && q.options && q.options.length > 0 && (
                          <div className="space-y-2">
                            <span className="text-[11px] font-bold uppercase tracking-wider text-gray-600 dark:text-gray-300 block">
                              Answer Options {q.isMultipleCorrectAllowed && '(Multiple correct allowed)'}:
                            </span>
                            <div className="space-y-1.5">
                              {q.options.map((opt, optIdx) => {
                                const letter = String.fromCharCode(65 + optIdx);
                                return (
                                  <div
                                    key={opt.id || optIdx}
                                    className={`p-2 rounded-lg text-xs flex items-center justify-between border ${
                                      opt.isCorrect
                                        ? 'bg-emerald-50 border-emerald-300 text-emerald-900 font-medium'
                                        : 'bg-white dark:bg-[#181C24] border-gray-200 dark:border-gray-800 text-gray-700 dark:text-gray-300'
                                    }`}
                                  >
                                    <div className="flex items-center gap-2">
                                      <span
                                        className={`w-5 h-5 rounded-full flex items-center justify-center font-bold text-[10px] ${
                                          opt.isCorrect
                                            ? 'bg-emerald-600 text-white'
                                            : 'bg-gray-200 text-gray-700'
                                        }`}
                                      >
                                        {letter}
                                      </span>
                                      <span>{opt.text}</span>
                                    </div>
                                    {opt.isCorrect && (
                                      <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-300 bg-white dark:bg-[#181C24] px-2 py-0.5 rounded border border-emerald-200 dark:border-emerald-800 flex items-center gap-1">
                                        <Check className="w-3 h-3 stroke-[3]" /> Correct Answer
                                      </span>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}

                        {/* True / False */}
                        {q.type === 'true_false' && (
                          <div className="flex items-center gap-2 text-xs">
                            <span className="font-semibold text-gray-600">Correct Answer:</span>
                            <span
                              className={`font-bold px-2.5 py-0.5 rounded text-xs ${
                                q.correctBool
                                  ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                                  : 'bg-rose-100 text-rose-800 border border-rose-300'
                              }`}
                            >
                              {q.correctBool ? 'True' : 'False'}
                            </span>
                          </div>
                        )}

                        {/* Fill in Blank */}
                        {q.type === 'fill_blank' && (
                          <div className="space-y-1.5 text-xs">
                            <span className="font-semibold text-gray-600 block">Accepted Answers:</span>
                            <div className="flex flex-wrap gap-1.5">
                              {q.acceptedAnswers && q.acceptedAnswers.length > 0 ? (
                                q.acceptedAnswers.map((ans, idx) => (
                                  <span
                                    key={idx}
                                    className="bg-emerald-50 text-emerald-800 border border-emerald-200 px-2 py-0.5 rounded font-mono font-medium"
                                  >
                                    "{ans}"
                                  </span>
                                ))
                              ) : (
                                <span className="text-gray-400 italic">No exact answers listed</span>
                              )}
                            </div>
                            <span className="text-[10px] text-gray-500 block">
                              Case sensitive: {q.caseSensitive ? 'Yes' : 'No (case-insensitive)'}
                            </span>
                          </div>
                        )}

                        {/* Matching Pairs */}
                        {q.type === 'matching' && q.matchingPairs && q.matchingPairs.length > 0 && (
                          <div className="space-y-1.5 text-xs">
                            <span className="font-semibold text-gray-600 block">Matching Association Pairs:</span>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                              {q.matchingPairs.map((pair) => (
                                <div
                                  key={pair.id}
                                  className="p-2 rounded bg-white dark:bg-[#1E232E] border border-gray-200 dark:border-gray-700 flex items-center justify-between gap-2"
                                >
                                  <span className="font-medium text-gray-800 dark:text-gray-200 truncate">{pair.left}</span>
                                  <span className="text-gray-400 shrink-0">➔</span>
                                  <span className="font-semibold text-indigo-700 truncate">{pair.right}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Short Answer Rubric */}
                        {q.expectedRubric && (
                          <div className="text-xs space-y-1">
                            <span className="font-semibold text-gray-600 block">Evaluation Rubric / Guideline:</span>
                            <p className="bg-amber-50/70 text-amber-900 border border-amber-200/80 p-2.5 rounded-lg text-xs">
                              {q.expectedRubric}
                            </p>
                          </div>
                        )}

                        {/* Pedagogical Explanation */}
                        {q.explanation && (
                          <div className="pt-2 border-t border-gray-200/80 text-xs space-y-1">
                            <span className="font-semibold text-indigo-700 flex items-center gap-1">
                              <Info className="w-3.5 h-3.5" /> Pedagogical Explanation:
                            </span>
                            <p className="bg-indigo-50/50 text-indigo-950 border border-indigo-100 p-2 rounded-lg text-xs leading-relaxed">
                              {q.explanation}
                            </p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Sticky Summary & Step Actions */}
          <div className="pt-4 border-t border-[#D9DEE7] dark:border-[#2D3545] flex flex-wrap items-center justify-between gap-3">
            <Button variant="secondary" onClick={handlePrevStep}>
              Back
            </Button>
            <div className="text-xs text-gray-600 font-medium">
              Selected: <span className="font-bold text-gray-900 dark:text-white">{selectedQuestionIds.length} questions</span> ({totalPoints} total points)
            </div>
            <Button variant="primary" rightIcon={<ChevronRight className="w-4 h-4" />} onClick={handleNextStep}>
              Next: Assessment settings
            </Button>
          </div>
        </div>
      )}

      {/* Step 3: Settings */}
      {currentStep === 3 && (
        <div className="bg-white dark:bg-[#181C24] rounded-xl border border-[#D9DEE7] dark:border-[#2D3545] p-6 shadow-2xs space-y-5 max-w-2xl">
          <h2 className="text-base font-bold text-[#1F2937] dark:text-white pb-2 border-b border-[#D9DEE7] dark:border-[#2D3545]">
            Step 3: Timing &amp; Policy Settings
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormField
              id="set-timelimit"
              label="Time Limit (Minutes)"
              helperText="Set 0 or empty for untimed assessments."
            >
              <input
                id="set-timelimit"
                type="number"
                min="0"
                max="180"
                value={timeLimit}
                onChange={(e) => setTimeLimit(parseInt(e.target.value, 10) || 0)}
                className="w-full bg-white dark:bg-[#1E232E] border border-[#D9DEE7] dark:border-gray-700 text-sm text-gray-900 dark:text-white rounded-lg px-3.5 py-2.5 focus:border-[#3156D3] focus:outline-none"
              />
            </FormField>

            <FormField
              id="set-attempts"
              label="Max Allowed Attempts"
              helperText="Number of submissions students can submit."
            >
              <input
                id="set-attempts"
                type="number"
                min="1"
                max="10"
                value={maxAttempts}
                onChange={(e) => setMaxAttempts(parseInt(e.target.value, 10) || 1)}
                className="w-full bg-white dark:bg-[#1E232E] border border-[#D9DEE7] dark:border-gray-700 text-sm text-gray-900 dark:text-white rounded-lg px-3.5 py-2.5 focus:border-[#3156D3] focus:outline-none"
              />
            </FormField>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormField
              id="set-passing"
              label="Passing Mastery Threshold (%)"
              helperText="Minimum score percentage considered successful."
            >
              <input
                id="set-passing"
                type="number"
                min="40"
                max="100"
                value={passingScore}
                onChange={(e) => setPassingScore(parseInt(e.target.value, 10) || 70)}
                className="w-full bg-white dark:bg-[#1E232E] border border-[#D9DEE7] dark:border-gray-700 text-sm text-gray-900 dark:text-white rounded-lg px-3.5 py-2.5 focus:border-[#3156D3] focus:outline-none"
              />
            </FormField>

            <FormField
              id="set-schedule"
              label="Scheduled Availability Date (Optional)"
              helperText="When this assessment becomes open to students."
            >
              <input
                id="set-schedule"
                type="date"
                value={scheduleDate}
                onChange={(e) => setScheduleDate(e.target.value)}
                className="w-full bg-white dark:bg-[#1E232E] border border-[#D9DEE7] dark:border-gray-700 text-sm text-gray-900 dark:text-white rounded-lg px-3.5 py-2.5 focus:border-[#3156D3] focus:outline-none"
              />
            </FormField>
          </div>

          <div className="pt-4 border-t border-[#D9DEE7] dark:border-[#2D3545] flex justify-between">
            <Button variant="secondary" onClick={handlePrevStep}>
              Back
            </Button>
            <Button variant="primary" rightIcon={<ChevronRight className="w-4 h-4" />} onClick={handleNextStep}>
              Next: Preview &amp; Publish
            </Button>
          </div>
        </div>
      )}

      {/* Step 4: Preview & Publish */}
      {currentStep === 4 && (
        <div className="bg-white dark:bg-[#181C24] rounded-xl border border-[#D9DEE7] dark:border-[#2D3545] p-6 shadow-2xs space-y-6">
          <div className="flex items-center justify-between pb-3 border-b border-[#D9DEE7] dark:border-[#2D3545] dark:border-[#2D3545] dark:border-[#2D3545] dark:border-[#2D3545]">
            <div>
              <h2 className="text-base font-bold text-[#1F2937] dark:text-white">
                Step 4: Student-Facing Preview &amp; Publication
              </h2>
              <p className="text-xs text-[#5B6472] dark:text-gray-400">
                Inspect the assessment exactly as enrolled learners will experience it.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="secondary" onClick={handleSaveDraft}>
                Save as draft
              </Button>
              <Button
                variant="primary"
                leftIcon={<UploadCloud className="w-4 h-4" />}
                onClick={handleConfirmPublish}
              >
                Publish assessment
              </Button>
            </div>
          </div>

          {/* Test Header / Banner */}
          <div className="p-5 rounded-xl bg-gray-50 dark:bg-[#1C212B] border border-gray-200 dark:border-gray-800 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs uppercase font-bold text-[#3156D3] tracking-wider">
                {type} Assessment
              </span>
              <span className="text-xs text-[#5B6472] dark:text-gray-400">
                Time: {timeLimit ? `${timeLimit} mins` : 'Untimed'} • Attempts: {maxAttempts} • Pass: {passingScore}%
              </span>
            </div>
            <h3 className="text-lg font-bold text-[#1F2937] dark:text-white">{title}</h3>
            <p className="text-xs text-[#5B6472] dark:text-gray-400">{instructions}</p>
          </div>

          {/* Render Questions as student sees them */}
          <div className="space-y-4">
            <span className="text-xs font-bold uppercase tracking-wider text-[#737D8C]">
              Assessment Items ({selectedQuestions.length} Questions, {totalPoints} Total Points)
            </span>

            {selectedQuestions.map((q, idx) => (
              <div
                key={q.id}
                className="p-5 rounded-xl border border-[#D9DEE7] dark:border-[#2D3545] bg-white dark:bg-[#181C24] space-y-3"
              >
                <div className="flex items-center justify-between text-xs text-[#737D8C]">
                  <span className="font-bold text-[#1F2937] dark:text-white">Question #{idx + 1}</span>
                  <span>{q.points || 1} points</span>
                </div>

                <p className="text-sm font-semibold text-[#1F2937] dark:text-gray-200 dark:text-gray-200 dark:text-gray-200 dark:text-gray-200 leading-relaxed">
                  {q.prompt}
                </p>

                {q.type === 'multiple_choice' && (
                  <div className="space-y-2 pt-1">
                    {(q.options || []).map((opt, i) => (
                      <div
                        key={opt.id}
                        className="p-3 rounded-lg border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-[#1C212B] text-xs flex items-center gap-3 text-[#1F2937] dark:text-gray-200"
                      >
                        <span className="w-5 h-5 rounded-full border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 flex items-center justify-center font-bold text-[10px]">
                          {String.fromCharCode(65 + i)}
                        </span>
                        <span>{opt.text}</span>
                      </div>
                    ))}
                  </div>
                )}

                {q.type === 'true_false' && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                    <div className="p-3 rounded-lg border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-[#1C212B] text-xs font-semibold text-center text-gray-800 dark:text-gray-200">
                      True
                    </div>
                    <div className="p-3 rounded-lg border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-[#1C212B] text-xs font-semibold text-center text-gray-800 dark:text-gray-200">
                      False
                    </div>
                  </div>
                )}

                {q.type === 'fill_blank' && (
                  <div className="pt-1">
                    <input
                      type="text"
                      disabled
                      placeholder="Type your answer here..."
                      className="w-full bg-gray-50 dark:bg-[#1C212B] border border-gray-200 dark:border-gray-800 text-xs text-gray-800 dark:text-gray-200 rounded-lg p-2.5 cursor-not-allowed"
                    />
                  </div>
                )}

                {q.type === 'matching' && (
                  <div className="pt-1 text-xs divide-y divide-gray-200 dark:divide-gray-800 border border-gray-200 dark:border-gray-800 rounded-lg bg-gray-50 dark:bg-[#1C212B]">
                    {(q.matchingPairs || []).map((pair) => (
                      <div key={pair.id} className="p-2.5 flex items-center justify-between gap-4">
                        <span className="font-medium text-[#1F2937] dark:text-gray-200">{pair.left}</span>
                        <div className="flex items-center gap-2 text-[#5B6472]">
                          <ArrowRight className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                          <span>{pair.right}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {q.type === 'short_answer' && (
                  <div className="pt-1">
                    <textarea
                      disabled
                      rows={3}
                      placeholder="Student enters extended response here..."
                      className="w-full bg-gray-50 dark:bg-[#1C212B] border border-gray-200 dark:border-gray-800 text-xs text-gray-800 dark:text-gray-200 rounded-lg p-2.5 cursor-not-allowed"
                    />
                  </div>
                )}
              </div>
            ))}
          </div>

          <div className="pt-4 border-t border-[#D9DEE7] dark:border-[#2D3545] flex justify-between">
            <Button variant="secondary" onClick={handlePrevStep}>
              Back to Settings
            </Button>
            <div className="flex items-center gap-2">
              <Button variant="secondary" onClick={handleSaveDraft}>
                Save draft
              </Button>
              <Button
                variant="primary"
                leftIcon={<UploadCloud className="w-4 h-4" />}
                onClick={handleConfirmPublish}
              >
                Publish assessment
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
