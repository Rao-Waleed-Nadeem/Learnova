import React, { useState, useEffect } from 'react';
import {
  Save,
  ArrowLeft,
  ArrowRight,
  Plus,
  Trash2,
  AlertTriangle,
  Eye,
  CheckCircle2,
  Check,
  HelpCircle,
  FileCheck,
} from 'lucide-react';
import { PageHeader } from '../components/ui/PageHeader';
import { Button } from '../components/ui/Button';
import { FormField } from '../components/ui/FormField';
import { StatusBadge } from '../components/ui/StatusBadge';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import {
  QuestionData,
  Course,
  Topic,
  QuestionType,
  Difficulty,
  MatchingPair,
} from '../types';
import { validateQuestion } from '../utils/assessment';

interface QuestionEditorPageProps {
  initialQuestion?: QuestionData;
  courses: Course[];
  topics: Topic[];
  onNavigate: (page: string, params?: Record<string, string>) => void;
  onSaveQuestion: (q: QuestionData) => void;
  onNotify: (type: 'success' | 'error' | 'info', msg: string) => void;
}

export const QuestionEditorPage: React.FC<QuestionEditorPageProps> = ({
  initialQuestion,
  courses,
  topics,
  onNavigate,
  onSaveQuestion,
  onNotify,
}) => {
  const isEditing = !!initialQuestion;

  // Common fields
  const [prompt, setPrompt] = useState(initialQuestion?.prompt || '');
  const [courseId, setCourseId] = useState(
    initialQuestion?.courseId || (courses[0]?.id ?? '')
  );
  const [topicId, setTopicId] = useState(
    initialQuestion?.topicId || (topics.find((t) => t.courseId === courseId)?.id ?? '')
  );
  const [type, setType] = useState<QuestionType>(
    initialQuestion?.type || 'multiple_choice'
  );
  const [difficulty, setDifficulty] = useState<Difficulty>(
    initialQuestion?.difficulty || 'medium'
  );
  const [points, setPoints] = useState<number>(initialQuestion?.points || 2);
  const [explanation, setExplanation] = useState(initialQuestion?.explanation || '');
  const [status, setStatus] = useState(initialQuestion?.status || 'approved');

  // Type-specific: Multiple Choice
  const [mcOptions, setMcOptions] = useState<
    { id: string; text: string; isCorrect: boolean }[]
  >(
    initialQuestion?.options || [
      { id: '1', text: '', isCorrect: true },
      { id: '2', text: '', isCorrect: false },
    ]
  );

  // Type-specific: True / False
  const [tfCorrect, setTfCorrect] = useState<boolean | null>(
    initialQuestion?.correctBool !== undefined ? initialQuestion.correctBool : true
  );

  // Type-specific: Fill in the blank
  const [acceptedAnswers, setAcceptedAnswers] = useState<string[]>(
    initialQuestion?.acceptedAnswers || ['']
  );
  const [caseSensitive, setCaseSensitive] = useState<boolean>(
    initialQuestion?.caseSensitive || false
  );

  // Type-specific: Matching pairs
  const [matchingPairs, setMatchingPairs] = useState<MatchingPair[]>(
    initialQuestion?.matchingPairs || [
      { id: '1', left: '', right: '' },
      { id: '2', left: '', right: '' },
    ]
  );

  // Type-specific: Short answer
  const [expectedRubric, setExpectedRubric] = useState<string>(
    initialQuestion?.expectedRubric || ''
  );

  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [typeChangeWarning, setTypeChangeWarning] = useState<QuestionType | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);

  // Filter topics for the selected course
  const availableTopics = topics.filter((t) => t.courseId === courseId);

  // When course changes, adjust topic selection if needed
  useEffect(() => {
    if (availableTopics.length > 0 && !availableTopics.some((t) => t.id === topicId)) {
      setTopicId(availableTopics[0].id);
    }
  }, [courseId, availableTopics, topicId]);

  const handleTypeSelect = (newType: QuestionType) => {
    if (newType === type) return;
    // Warn if existing content would be lost
    setTypeChangeWarning(newType);
  };

  const confirmTypeChange = () => {
    if (typeChangeWarning) {
      setType(typeChangeWarning);
      setTypeChangeWarning(null);
    }
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();

    const candidateQuestion: Partial<QuestionData> = {
      id: initialQuestion ? initialQuestion.id : `q-${Date.now()}`,
      courseId,
      topicId,
      type,
      prompt: prompt.trim(),
      difficulty,
      points: Number(points) || 1,
      explanation: explanation.trim(),
      status,
      source: initialQuestion?.source || 'teacher',
      options: type === 'multiple_choice' ? mcOptions : undefined,
      correctBool: type === 'true_false' ? (tfCorrect ?? true) : undefined,
      acceptedAnswers:
        type === 'fill_blank'
          ? acceptedAnswers.map((a) => a.trim()).filter(Boolean)
          : undefined,
      caseSensitive: type === 'fill_blank' ? caseSensitive : undefined,
      matchingPairs: type === 'matching' ? matchingPairs : undefined,
      expectedRubric: type === 'short_answer' ? expectedRubric.trim() : undefined,
      createdAt: initialQuestion ? initialQuestion.createdAt : new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const issues = validateQuestion(candidateQuestion);
    if (issues.length > 0) {
      const errMap: Record<string, string> = {};
      issues.forEach((iss) => {
        errMap[iss.field] = iss.message;
      });
      setFieldErrors(errMap);
      onNotify('error', 'Please resolve the highlighted validation errors.');
      return;
    }

    setFieldErrors({});
    onSaveQuestion(candidateQuestion as QuestionData);
    onNotify('success', isEditing ? 'Question saved.' : 'Question created in bank.');
    onNavigate('questions');
  };

  return (
    <div className="space-y-6">
      <PageHeader
        breadcrumbs={[
          { label: 'Question Bank', onClick: () => onNavigate('questions') },
          { label: isEditing ? 'Edit Question' : 'Create Question', active: true },
        ]}
        title={isEditing ? 'Edit Question' : 'Create Question'}
        description="Author assessment questions with type-specific answer structures, pedagogical explanations, and difficulty ratings."
        status={status}
        primaryAction={
          <Button
            variant="primary"
            leftIcon={<Save className="w-4 h-4" />}
            onClick={handleSave}
          >
            {isEditing ? 'Save changes' : 'Save question'}
          </Button>
        }
        secondaryActions={
          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              leftIcon={<Eye className="w-4 h-4" />}
              onClick={() => setPreviewOpen(true)}
            >
              Preview
            </Button>
            <Button
              variant="ghost"
              size="sm"
              leftIcon={<ArrowLeft className="w-4 h-4" />}
              onClick={() => onNavigate('questions')}
            >
              Cancel
            </Button>
          </div>
        }
      />

      <form onSubmit={handleSave} className="space-y-6 max-w-4xl">
        {/* Course and Topic Association */}
        <div className="bg-white rounded-xl border border-[#D9DEE7] p-5 shadow-2xs space-y-4">
          <h2 className="text-sm font-bold text-[#1F2937] pb-2 border-b border-[#D9DEE7]">
            1. Curriculum Association &amp; Metadata
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormField
              id="q-course"
              label="Associated Course"
              required
              error={fieldErrors.courseId}
            >
              <select
                id="q-course"
                value={courseId}
                onChange={(e) => setCourseId(e.target.value)}
                className="w-full bg-white border border-[#D9DEE7] text-sm rounded-lg px-3.5 py-2.5 focus:border-[#3156D3] focus:outline-none"
              >
                {courses.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.title}
                  </option>
                ))}
              </select>
            </FormField>

            <FormField
              id="q-topic"
              label="Curriculum Topic"
              required
              error={fieldErrors.topicId}
            >
              <select
                id="q-topic"
                value={topicId}
                onChange={(e) => setTopicId(e.target.value)}
                className="w-full bg-white border border-[#D9DEE7] text-sm rounded-lg px-3.5 py-2.5 focus:border-[#3156D3] focus:outline-none"
              >
                {availableTopics.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.title}
                  </option>
                ))}
              </select>
            </FormField>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
            <FormField id="q-diff" label="Difficulty">
              <select
                id="q-diff"
                value={difficulty}
                onChange={(e) => setDifficulty(e.target.value as Difficulty)}
                className="w-full bg-white border border-[#D9DEE7] text-sm rounded-lg px-3.5 py-2 focus:border-[#3156D3] focus:outline-none"
              >
                <option value="easy">Easy</option>
                <option value="medium">Medium</option>
                <option value="hard">Hard</option>
              </select>
            </FormField>

            <FormField id="q-points" label="Points / Weight">
              <input
                id="q-points"
                type="number"
                min="1"
                max="20"
                value={points}
                onChange={(e) => setPoints(parseInt(e.target.value, 10) || 1)}
                className="w-full bg-white border border-[#D9DEE7] text-sm rounded-lg px-3.5 py-2 focus:border-[#3156D3] focus:outline-none"
              />
            </FormField>

            <FormField id="q-status" label="Approval Status">
              <select
                id="q-status"
                value={status}
                onChange={(e) => setStatus(e.target.value as any)}
                className="w-full bg-white border border-[#D9DEE7] text-sm rounded-lg px-3.5 py-2 focus:border-[#3156D3] focus:outline-none"
              >
                <option value="approved">Approved for Assessments</option>
                <option value="draft">Draft (Work in progress)</option>
                <option value="pending_review">Pending Review</option>
              </select>
            </FormField>
          </div>
        </div>

        {/* Question Type Selector */}
        <div className="bg-white rounded-xl border border-[#D9DEE7] p-5 shadow-2xs space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-[#D9DEE7]">
            <h2 className="text-sm font-bold text-[#1F2937]">2. Select Question Type</h2>
            <span className="text-xs text-[#5B6472]">5 supported formats</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
            {[
              { id: 'multiple_choice', label: 'Multiple Choice' },
              { id: 'true_false', label: 'True / False' },
              { id: 'fill_blank', label: 'Fill in Blank' },
              { id: 'matching', label: 'Matching Pairs' },
              { id: 'short_answer', label: 'Short Answer' },
            ].map((t) => {
              const isSelected = type === t.id;
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => handleTypeSelect(t.id as QuestionType)}
                  className={`p-3 rounded-lg border text-xs font-semibold text-center transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-[#E8EEFF] border-[#3156D3] text-[#2646B8] shadow-xs'
                      : 'bg-white border-[#D9DEE7] text-[#5B6472] hover:bg-gray-50'
                  }`}
                >
                  {t.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Question Prompt */}
        <div className="bg-white rounded-xl border border-[#D9DEE7] p-5 shadow-2xs space-y-4">
          <h2 className="text-sm font-bold text-[#1F2937] pb-2 border-b border-[#D9DEE7]">
            3. Question Stem &amp; Prompt
          </h2>

          <FormField
            id="q-prompt"
            label="Question Prompt"
            required
            error={fieldErrors.prompt}
            helperText="Write the clear question statement for students."
          >
            <textarea
              id="q-prompt"
              rows={3}
              value={prompt}
              onChange={(e) => {
                setPrompt(e.target.value);
                if (fieldErrors.prompt) setFieldErrors({ ...fieldErrors, prompt: '' });
              }}
              placeholder="e.g. Which keyword declares an asynchronous function in Python?"
              className="w-full bg-white border border-[#D9DEE7] text-sm rounded-lg px-3.5 py-2.5 focus:border-[#3156D3] focus:outline-none"
            />
          </FormField>
        </div>

        {/* Type-Specific Answer Controls */}
        <div className="bg-white rounded-xl border border-[#D9DEE7] p-5 shadow-2xs space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-[#D9DEE7]">
            <h2 className="text-sm font-bold text-[#1F2937]">
              4. Answer Configuration ({type.replace('_', ' ')})
            </h2>
            <span className="text-xs font-medium text-[#3156D3]">Answer Key Mode</span>
          </div>

          {/* Multiple Choice Editor */}
          {type === 'multiple_choice' && (
            <div className="space-y-3">
              <p className="text-xs text-[#5B6472]">
                Provide at least 2 options and select the radio button for the correct answer.
              </p>
              {fieldErrors.options && (
                <p className="text-xs text-[#B42318]">{fieldErrors.options}</p>
              )}

              <div className="space-y-2">
                {mcOptions.map((opt, idx) => (
                  <div key={opt.id} className="flex items-center gap-3">
                    <label className="flex items-center gap-1.5 cursor-pointer shrink-0">
                      <input
                        type="radio"
                        name="correct-option"
                        checked={opt.isCorrect}
                        onChange={() => {
                          setMcOptions(
                            mcOptions.map((o) => ({
                              ...o,
                              isCorrect: o.id === opt.id,
                            }))
                          );
                        }}
                        className="w-4 h-4 text-[#3156D3] focus:ring-[#3156D3]"
                      />
                      <span className="text-xs font-bold text-[#5B6472]">
                        {String.fromCharCode(65 + idx)}
                      </span>
                    </label>

                    <input
                      type="text"
                      value={opt.text}
                      onChange={(e) => {
                        const val = e.target.value;
                        setMcOptions(
                          mcOptions.map((o) => (o.id === opt.id ? { ...o, text: val } : o))
                        );
                      }}
                      placeholder={`Option ${String.fromCharCode(65 + idx)}`}
                      className={`flex-1 bg-white border text-xs rounded-lg px-3 py-2 focus:outline-none ${
                        opt.isCorrect
                          ? 'border-[#18794E] bg-[#EAF7F0]/30 font-medium'
                          : 'border-[#D9DEE7]'
                      }`}
                    />

                    {mcOptions.length > 2 && (
                      <button
                        type="button"
                        onClick={() =>
                          setMcOptions(mcOptions.filter((o) => o.id !== opt.id))
                        }
                        className="p-1.5 text-gray-400 hover:text-red-600 rounded cursor-pointer"
                        title="Delete option"
                        aria-label={`Delete option ${String.fromCharCode(65 + idx)}`}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                ))}
              </div>

              {mcOptions.length < 6 && (
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  leftIcon={<Plus className="w-3 h-3" />}
                  onClick={() =>
                    setMcOptions([
                      ...mcOptions,
                      { id: `opt-${Date.now()}`, text: '', isCorrect: false },
                    ])
                  }
                >
                  Add Option
                </Button>
              )}
            </div>
          )}

          {/* True / False Editor */}
          {type === 'true_false' && (
            <div className="space-y-3">
              <p className="text-xs text-[#5B6472]">Select the correct factual answer.</p>
              <div className="grid grid-cols-2 gap-4 max-w-sm">
                <button
                  type="button"
                  onClick={() => setTfCorrect(true)}
                  className={`p-4 rounded-xl border text-sm font-bold transition-all cursor-pointer flex items-center justify-center gap-2 ${
                    tfCorrect === true
                      ? 'bg-[#EAF7F0] border-[#18794E] text-[#18794E] shadow-xs'
                      : 'bg-white border-[#D9DEE7] text-[#5B6472] hover:bg-gray-50'
                  }`}
                >
                  <span>True</span>
                  {tfCorrect === true && (
                    <span className="text-xs font-semibold flex items-center gap-1">
                      (<Check className="w-3.5 h-3.5" /> Correct)
                    </span>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => setTfCorrect(false)}
                  className={`p-4 rounded-xl border text-sm font-bold transition-all cursor-pointer flex items-center justify-center gap-2 ${
                    tfCorrect === false
                      ? 'bg-[#EAF7F0] border-[#18794E] text-[#18794E] shadow-xs'
                      : 'bg-white border-[#D9DEE7] text-[#5B6472] hover:bg-gray-50'
                  }`}
                >
                  <span>False</span>
                  {tfCorrect === false && (
                    <span className="text-xs font-semibold flex items-center gap-1">
                      (<Check className="w-3.5 h-3.5" /> Correct)
                    </span>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* Fill in the Blank Editor */}
          {type === 'fill_blank' && (
            <div className="space-y-3">
              <p className="text-xs text-[#5B6472]">
                Specify one or more accepted string answers for automatic grading normalization.
              </p>
              {fieldErrors.acceptedAnswers && (
                <p className="text-xs text-[#B42318]">{fieldErrors.acceptedAnswers}</p>
              )}

              <div className="space-y-2">
                {acceptedAnswers.map((ans, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <span className="text-xs text-[#737D8C] font-mono">#{idx + 1}</span>
                    <input
                      type="text"
                      value={ans}
                      onChange={(e) => {
                        const val = e.target.value;
                        const copy = [...acceptedAnswers];
                        copy[idx] = val;
                        setAcceptedAnswers(copy);
                      }}
                      placeholder="e.g., async"
                      className="flex-1 font-mono bg-white border border-[#D9DEE7] text-xs rounded-lg px-3 py-2 focus:border-[#3156D3] focus:outline-none"
                    />
                    {acceptedAnswers.length > 1 && (
                      <button
                        type="button"
                        onClick={() =>
                          setAcceptedAnswers(acceptedAnswers.filter((_, i) => i !== idx))
                        }
                        className="p-1.5 text-gray-400 hover:text-red-600 rounded cursor-pointer"
                        title="Remove answer alternative"
                        aria-label={`Remove answer alternative ${idx + 1}`}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                ))}
              </div>

              <div className="flex items-center justify-between pt-2">
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  leftIcon={<Plus className="w-3 h-3" />}
                  onClick={() => setAcceptedAnswers([...acceptedAnswers, ''])}
                >
                  Add Accepted Alternative
                </Button>

                <label className="flex items-center gap-2 text-xs text-[#5B6472] cursor-pointer">
                  <input
                    type="checkbox"
                    checked={caseSensitive}
                    onChange={(e) => setCaseSensitive(e.target.checked)}
                    className="rounded text-[#3156D3] focus:ring-[#3156D3]"
                  />
                  <span>Enforce case sensitivity</span>
                </label>
              </div>
            </div>
          )}

          {/* Matching Pairs Editor */}
          {type === 'matching' && (
            <div className="space-y-3">
              <p className="text-xs text-[#5B6472]">
                Define pairs of left terms and corresponding right definitions.
              </p>
              {fieldErrors.matchingPairs && (
                <p className="text-xs text-[#B42318]">{fieldErrors.matchingPairs}</p>
              )}

              <div className="space-y-2">
                {matchingPairs.map((pair, idx) => (
                  <div key={pair.id} className="flex items-center gap-2">
                    <input
                      type="text"
                      value={pair.left}
                      onChange={(e) => {
                        const val = e.target.value;
                        setMatchingPairs(
                          matchingPairs.map((p) => (p.id === pair.id ? { ...p, left: val } : p))
                        );
                      }}
                      placeholder={`Left Item ${idx + 1}`}
                      className="flex-1 bg-white border border-[#D9DEE7] text-xs rounded-lg px-3 py-2 focus:border-[#3156D3] focus:outline-none"
                    />
                    <ArrowRight className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                    <input
                      type="text"
                      value={pair.right}
                      onChange={(e) => {
                        const val = e.target.value;
                        setMatchingPairs(
                          matchingPairs.map((p) => (p.id === pair.id ? { ...p, right: val } : p))
                        );
                      }}
                      placeholder={`Matching Definition ${idx + 1}`}
                      className="flex-1 bg-white border border-[#D9DEE7] text-xs rounded-lg px-3 py-2 focus:border-[#3156D3] focus:outline-none"
                    />
                    {matchingPairs.length > 2 && (
                      <button
                        type="button"
                        onClick={() =>
                          setMatchingPairs(matchingPairs.filter((p) => p.id !== pair.id))
                        }
                        className="p-1.5 text-gray-400 hover:text-red-600 rounded cursor-pointer"
                        title="Remove pair"
                        aria-label={`Remove pair ${idx + 1}`}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                ))}
              </div>

              {matchingPairs.length < 6 && (
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  leftIcon={<Plus className="w-3 h-3" />}
                  onClick={() =>
                    setMatchingPairs([
                      ...matchingPairs,
                      { id: `pair-${Date.now()}`, left: '', right: '' },
                    ])
                  }
                >
                  Add Matching Pair
                </Button>
              )}
            </div>
          )}

          {/* Short Answer Rubric Editor */}
          {type === 'short_answer' && (
            <div className="space-y-3">
              <FormField
                id="q-rubric"
                label="Expected Answer / Grading Criteria"
                required
                error={fieldErrors.expectedRubric}
                helperText="List required concepts, keywords, or sample benchmark responses."
              >
                <textarea
                  id="q-rubric"
                  rows={4}
                  value={expectedRubric}
                  onChange={(e) => setExpectedRubric(e.target.value)}
                  placeholder="e.g. Student must mention: 1) GIL mutex prevents parallel byte-code execution across threads, 2) Multi-processing is required for CPU-bound parallelism."
                  className="w-full bg-white border border-[#D9DEE7] text-xs rounded-lg px-3.5 py-2.5 focus:border-[#3156D3] focus:outline-none font-mono"
                />
              </FormField>
            </div>
          )}
        </div>

        {/* Pedagogical Explanation */}
        <div className="bg-white rounded-xl border border-[#D9DEE7] p-5 shadow-2xs space-y-3">
          <h2 className="text-sm font-bold text-[#1F2937] pb-2 border-b border-[#D9DEE7]">
            5. Pedagogical Rationale &amp; Explanation
          </h2>
          <FormField
            id="q-explanation"
            label="Detailed Explanation"
            helperText="Shown to students after assessment submission to reinforce conceptual understanding."
          >
            <textarea
              id="q-explanation"
              rows={3}
              value={explanation}
              onChange={(e) => setExplanation(e.target.value)}
              placeholder="Explain why the correct answer is valid and clarify common misconceptions..."
              className="w-full bg-white border border-[#D9DEE7] text-xs rounded-lg px-3.5 py-2.5 focus:border-[#3156D3] focus:outline-none"
            />
          </FormField>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between pt-4 border-t border-[#D9DEE7]">
          <Button
            type="button"
            variant="secondary"
            onClick={() => onNavigate('questions')}
          >
            Cancel
          </Button>

          <div className="flex items-center gap-3">
            <Button
              type="button"
              variant="outline"
              leftIcon={<Eye className="w-4 h-4" />}
              onClick={() => setPreviewOpen(true)}
            >
              Preview
            </Button>
            <Button
              type="submit"
              variant="primary"
              leftIcon={<Save className="w-4 h-4" />}
            >
              {isEditing ? 'Save changes' : 'Save question'}
            </Button>
          </div>
        </div>
      </form>

      {/* Type Change Warning Dialog */}
      <ConfirmDialog
        isOpen={!!typeChangeWarning}
        title="Change question type?"
        consequence="Switching question type will reset incompatible answer data (e.g. converting multiple choice options to true/false)."
        isDestructive
        confirmLabel="Change question type"
        onConfirm={confirmTypeChange}
        onCancel={() => setTypeChangeWarning(null)}
      />
    </div>
  );
};
