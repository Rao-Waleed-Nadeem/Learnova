import React, { useState } from 'react';
import {
  Check,
  ChevronRight,
  ChevronLeft,
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
} from 'lucide-react';
import { PageHeader } from '../components/ui/PageHeader';
import { Button } from '../components/ui/Button';
import { FormField } from '../components/ui/FormField';
import { StatusBadge } from '../components/ui/StatusBadge';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { Assessment, Course, Topic, QuestionData, AssessmentType, AssessmentStatus } from '../types';
import { calculateAssessmentTotalPoints } from '../utils/assessment';

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

  // Step 2: Questions
  const [selectedQuestionIds, setSelectedQuestionIds] = useState<string[]>(
    initialAssessment?.questionIds || []
  );
  const [qSearch, setQSearch] = useState('');

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
  const [publishModalOpen, setPublishModalOpen] = useState(false);
  const [stepErrors, setStepErrors] = useState<Record<string, string>>({});

  // Filter available questions: only approved questions in this course (or general)
  const availableQuestions = questions.filter((q) => {
    const matchesCourse = q.courseId === courseId;
    const matchesApproved = q.status === 'approved';
    const matchesSearch =
      q.prompt.toLowerCase().includes(qSearch.toLowerCase()) ||
      q.type.toLowerCase().includes(qSearch.toLowerCase());
    return matchesCourse && matchesApproved && matchesSearch;
  });

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
    if (selectedQuestionIds.length === 0) {
      onNotify('error', 'Cannot publish an assessment with zero questions.');
      setPublishModalOpen(false);
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
    setPublishModalOpen(false);
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
                onClick={() => setPublishModalOpen(true)}
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
      <div className="bg-white rounded-xl border border-[#D9DEE7] p-4 shadow-2xs flex flex-wrap items-center justify-between gap-4 text-xs">
        <div className="flex items-center gap-4 flex-wrap">
          <div>
            <span className="text-[#737D8C] block uppercase font-semibold text-[10px]">Title</span>
            <span className="font-bold text-[#1F2937] text-sm">{title || 'Untitled Assessment'}</span>
          </div>
          <div className="w-px h-6 bg-gray-200 hidden sm:block" />
          <div>
            <span className="text-[#737D8C] block uppercase font-semibold text-[10px]">Type</span>
            <span className="capitalize font-semibold text-[#3156D3] bg-[#E8EEFF] px-2 py-0.5 rounded">
              {type}
            </span>
          </div>
          <div className="w-px h-6 bg-gray-200 hidden sm:block" />
          <div>
            <span className="text-[#737D8C] block uppercase font-semibold text-[10px]">Questions</span>
            <span className="font-semibold text-[#1F2937]">{selectedQuestionIds.length} chosen</span>
          </div>
          <div className="w-px h-6 bg-gray-200 hidden sm:block" />
          <div>
            <span className="text-[#737D8C] block uppercase font-semibold text-[10px]">Total Points</span>
            <span className="font-bold text-[#18794E]">{totalPoints} pts</span>
          </div>
        </div>

        <button
          onClick={() => onNavigate('assessments')}
          className="text-xs text-[#5B6472] hover:text-[#1F2937] flex items-center gap-1 cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Exit to list</span>
        </button>
      </div>

      {/* 4-Step Progress Header */}
      <div className="bg-white rounded-xl border border-[#D9DEE7] p-4 shadow-2xs">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
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
                    ? 'bg-gray-50 border border-gray-200 text-[#1F2937]'
                    : 'text-[#737D8C] border border-transparent opacity-60'
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
                  <span className="text-[10px] uppercase font-semibold block text-[#737D8C]">
                    Step {st.num}
                  </span>
                  <span className={`text-xs font-bold ${isCurrent ? 'text-[#2646B8]' : 'text-[#1F2937]'}`}>
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
        <div className="bg-white rounded-xl border border-[#D9DEE7] p-6 shadow-2xs space-y-5 max-w-3xl">
          <h2 className="text-base font-bold text-[#1F2937] pb-2 border-b border-[#D9DEE7]">
            Step 1: Assessment Details &amp; Objectives
          </h2>

          <FormField id="asm-title" label="Assessment Title" required error={stepErrors.title}>
            <input
              id="asm-title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., Midterm Evaluation: Core Programming Constructs"
              className="w-full bg-white border border-[#D9DEE7] text-sm rounded-lg px-3.5 py-2.5 focus:border-[#3156D3] focus:outline-none"
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
                className="w-full bg-white border border-[#D9DEE7] text-sm rounded-lg px-3.5 py-2.5 focus:border-[#3156D3] focus:outline-none"
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
                className="w-full bg-white border border-[#D9DEE7] text-sm rounded-lg px-3.5 py-2.5 focus:border-[#3156D3] focus:outline-none"
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
            <div className="grid grid-cols-3 gap-3">
              {(['diagnostic', 'formative', 'summative'] as AssessmentType[]).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setType(t)}
                  className={`p-3 rounded-xl border text-xs font-semibold capitalize text-center transition-all cursor-pointer ${
                    type === t
                      ? 'bg-[#E8EEFF] border-[#3156D3] text-[#2646B8] shadow-xs'
                      : 'bg-white border-[#D9DEE7] text-[#5B6472] hover:bg-gray-50'
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
              className="w-full bg-white border border-[#D9DEE7] text-sm rounded-lg px-3.5 py-2.5 focus:border-[#3156D3] focus:outline-none"
            />
          </FormField>

          <div className="pt-4 border-t border-[#D9DEE7] flex justify-end">
            <Button variant="primary" rightIcon={<ChevronRight className="w-4 h-4" />} onClick={handleNextStep}>
              Next: Select questions
            </Button>
          </div>
        </div>
      )}

      {/* Step 2: Questions */}
      {currentStep === 2 && (
        <div className="bg-white rounded-xl border border-[#D9DEE7] p-6 shadow-2xs space-y-5">
          <div className="flex items-center justify-between pb-2 border-b border-[#D9DEE7]">
            <div>
              <h2 className="text-base font-bold text-[#1F2937]">Step 2: Select Questions</h2>
              <p className="text-xs text-[#5B6472]">
                Choose approved items from the question bank for this course.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold bg-[#E8EEFF] text-[#2646B8] px-2.5 py-1 rounded-full">
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

          {/* Search available questions */}
          <input
            type="search"
            value={qSearch}
            onChange={(e) => setQSearch(e.target.value)}
            placeholder="Search approved questions by keyword or type..."
            className="w-full bg-white border border-[#D9DEE7] text-xs rounded-lg px-3.5 py-2 focus:border-[#3156D3] focus:outline-none"
          />

          {availableQuestions.length === 0 ? (
            <div className="text-center py-12 text-[#5B6472] text-xs">
              <p className="font-semibold text-[#1F2937]">No approved questions found</p>
              <p className="mt-1">
                You can create questions or generate candidate questions in the Question Bank.
              </p>
              <Button
                variant="secondary"
                size="sm"
                className="mt-3"
                onClick={() => onNavigate('question_editor')}
              >
                Create new question
              </Button>
            </div>
          ) : (
            <div className="divide-y divide-gray-100 max-h-[500px] overflow-y-auto">
              {availableQuestions.map((q) => {
                const isSelected = selectedQuestionIds.includes(q.id);

                return (
                  <div
                    key={q.id}
                    onClick={() => handleToggleQuestion(q.id)}
                    className={`p-3 rounded-lg my-1 flex items-start gap-3 transition-colors cursor-pointer select-none ${
                      isSelected
                        ? 'bg-[#E8EEFF] border border-[#3156D3]/40'
                        : 'hover:bg-gray-50 border border-transparent'
                    }`}
                  >
                    <div
                      className={`w-5 h-5 rounded flex items-center justify-center shrink-0 mt-0.5 border ${
                        isSelected
                          ? 'bg-[#3156D3] border-[#3156D3] text-white'
                          : 'border-gray-300 bg-white'
                      }`}
                    >
                      {isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-[#1F2937] capitalize bg-gray-100 px-2 py-0.5 rounded">
                          {q.type.replace('_', ' ')}
                        </span>
                        <span className="text-xs text-[#737D8C]">{q.points || 1} pts</span>
                        <span className="text-xs font-medium text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded">
                          {q.difficulty}
                        </span>
                      </div>
                      <p className="text-xs font-medium text-[#1F2937] mt-1 line-clamp-2">
                        {q.prompt}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          <div className="pt-4 border-t border-[#D9DEE7] flex justify-between">
            <Button variant="secondary" onClick={handlePrevStep}>
              Back
            </Button>
            <Button variant="primary" rightIcon={<ChevronRight className="w-4 h-4" />} onClick={handleNextStep}>
              Next: Assessment settings
            </Button>
          </div>
        </div>
      )}

      {/* Step 3: Settings */}
      {currentStep === 3 && (
        <div className="bg-white rounded-xl border border-[#D9DEE7] p-6 shadow-2xs space-y-5 max-w-2xl">
          <h2 className="text-base font-bold text-[#1F2937] pb-2 border-b border-[#D9DEE7]">
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
                className="w-full bg-white border border-[#D9DEE7] text-sm rounded-lg px-3.5 py-2.5 focus:border-[#3156D3] focus:outline-none"
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
                className="w-full bg-white border border-[#D9DEE7] text-sm rounded-lg px-3.5 py-2.5 focus:border-[#3156D3] focus:outline-none"
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
                className="w-full bg-white border border-[#D9DEE7] text-sm rounded-lg px-3.5 py-2.5 focus:border-[#3156D3] focus:outline-none"
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
                className="w-full bg-white border border-[#D9DEE7] text-sm rounded-lg px-3.5 py-2.5 focus:border-[#3156D3] focus:outline-none"
              />
            </FormField>
          </div>

          <div className="pt-4 border-t border-[#D9DEE7] flex justify-between">
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
        <div className="bg-white rounded-xl border border-[#D9DEE7] p-6 shadow-2xs space-y-6">
          <div className="flex items-center justify-between pb-3 border-b border-[#D9DEE7]">
            <div>
              <h2 className="text-base font-bold text-[#1F2937]">
                Step 4: Student-Facing Preview &amp; Publication
              </h2>
              <p className="text-xs text-[#5B6472]">
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
                onClick={() => setPublishModalOpen(true)}
              >
                Publish assessment
              </Button>
            </div>
          </div>

          {/* Test Header / Banner */}
          <div className="p-5 rounded-xl bg-gray-50 border border-gray-200 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs uppercase font-bold text-[#3156D3] tracking-wider">
                {type} Assessment
              </span>
              <span className="text-xs text-[#5B6472]">
                Time: {timeLimit ? `${timeLimit} mins` : 'Untimed'} • Attempts: {maxAttempts} • Pass: {passingScore}%
              </span>
            </div>
            <h3 className="text-lg font-bold text-[#1F2937]">{title}</h3>
            <p className="text-xs text-[#5B6472]">{instructions}</p>
          </div>

          {/* Render Questions as student sees them */}
          <div className="space-y-4">
            <span className="text-xs font-bold uppercase tracking-wider text-[#737D8C]">
              Assessment Items ({selectedQuestions.length} Questions, {totalPoints} Total Points)
            </span>

            {selectedQuestions.map((q, idx) => (
              <div
                key={q.id}
                className="p-5 rounded-xl border border-[#D9DEE7] bg-white space-y-3"
              >
                <div className="flex items-center justify-between text-xs text-[#737D8C]">
                  <span className="font-bold text-[#1F2937]">Question #{idx + 1}</span>
                  <span>{q.points || 1} points</span>
                </div>

                <p className="text-sm font-semibold text-[#1F2937] leading-relaxed">
                  {q.prompt}
                </p>

                {q.type === 'multiple_choice' && (
                  <div className="space-y-2 pt-1">
                    {(q.options || []).map((opt, i) => (
                      <div
                        key={opt.id}
                        className="p-3 rounded-lg border border-gray-200 bg-gray-50 text-xs flex items-center gap-3 text-[#1F2937]"
                      >
                        <span className="w-5 h-5 rounded-full border border-gray-300 bg-white flex items-center justify-center font-bold text-[10px]">
                          {String.fromCharCode(65 + i)}
                        </span>
                        <span>{opt.text}</span>
                      </div>
                    ))}
                  </div>
                )}

                {q.type === 'true_false' && (
                  <div className="grid grid-cols-2 gap-3 pt-1">
                    <div className="p-3 rounded-lg border border-gray-200 bg-gray-50 text-xs font-semibold text-center">
                      True
                    </div>
                    <div className="p-3 rounded-lg border border-gray-200 bg-gray-50 text-xs font-semibold text-center">
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
                      className="w-full bg-gray-50 border border-gray-200 text-xs rounded-lg p-2.5 cursor-not-allowed"
                    />
                  </div>
                )}

                {q.type === 'matching' && (
                  <div className="pt-1 text-xs divide-y border rounded-lg bg-gray-50">
                    {(q.matchingPairs || []).map((pair) => (
                      <div key={pair.id} className="p-2.5 flex items-center justify-between gap-4">
                        <span className="font-medium text-[#1F2937]">{pair.left}</span>
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
                      className="w-full bg-gray-50 border border-gray-200 text-xs rounded-lg p-2.5 cursor-not-allowed"
                    />
                  </div>
                )}
              </div>
            ))}
          </div>

          <div className="pt-4 border-t border-[#D9DEE7] flex justify-between">
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
                onClick={() => setPublishModalOpen(true)}
              >
                Publish assessment
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal for Publishing */}
      <ConfirmDialog
        isOpen={publishModalOpen}
        title="Publish assessment now?"
        targetObject={title}
        consequence={`Once published, enrolled students can start attempts. The test contains ${selectedQuestionIds.length} questions worth ${totalPoints} points.`}
        confirmLabel="Publish assessment"
        onConfirm={handleConfirmPublish}
        onCancel={() => setPublishModalOpen(false)}
      />
    </div>
  );
};
