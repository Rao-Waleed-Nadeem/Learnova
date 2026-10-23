import React, { useState } from 'react';
import {
  Sparkles,
  CheckCircle2,
  Check,
  Plus,
  XCircle,
  Edit3,
  AlertTriangle,
  RotateCcw,
  BookOpen,
  Layers,
  ArrowRight,
  Info,
  Clock,
  Loader2,
  FileCheck,
} from 'lucide-react';
import { PageHeader } from '../../components/ui/PageHeader';
import { Button } from '../../components/ui/Button';
import { FormField } from '../../components/ui/FormField';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { EmptyState } from '../../components/ui/EmptyState';
import {
  Course,
  Topic,
  LearningResource,
  AICandidateQuestion,
  QuestionType,
  Difficulty,
} from '../../types';

interface AIReviewPageProps {
  courses: Course[];
  topics: Topic[];
  resources: LearningResource[];
  candidates: AICandidateQuestion[];
  onNavigate: (page: string, params?: Record<string, string>) => void;
  onSaveGeneratedCandidates: (candidates: AICandidateQuestion[]) => void;
  onUpdateCandidateStatus: (
    id: string,
    status: 'approved' | 'rejected',
    reason?: string
  ) => void;
  onNotify: (type: 'success' | 'error' | 'info', msg: string) => void;
}

export const AIReviewPage: React.FC<AIReviewPageProps> = ({
  courses,
  topics,
  resources,
  candidates,
  onNavigate,
  onSaveGeneratedCandidates,
  onUpdateCandidateStatus,
  onNotify,
}) => {
  // Generation setup states
  const [selectedCourseId, setSelectedCourseId] = useState<string>(
    courses[0]?.id || ''
  );
  const courseTopics = topics.filter((t) => t.courseId === selectedCourseId);
  const [selectedTopicId, setSelectedTopicId] = useState<string>(
    courseTopics[0]?.id || ''
  );
  const topicResources = resources.filter((r) => r.courseId === selectedCourseId);
  const [selectedResourceId, setSelectedResourceId] = useState<string>('');
  const [customContext, setCustomContext] = useState('');

  const [selectedTypes, setSelectedTypes] = useState<QuestionType[]>([
    'multiple_choice',
    'true_false',
  ]);
  const [difficulty, setDifficulty] = useState<Difficulty>('medium');
  const [questionCount, setQuestionCount] = useState<number>(3);

  const [isGenerating, setIsGenerating] = useState(false);
  const [rejectModalId, setRejectModalId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  // When course changes, update topic selection
  const handleCourseChange = (id: string) => {
    setSelectedCourseId(id);
    const newTopics = topics.filter((t) => t.courseId === id);
    if (newTopics.length > 0) {
      setSelectedTopicId(newTopics[0].id);
    }
  };

  const handleToggleType = (qType: QuestionType) => {
    if (selectedTypes.includes(qType)) {
      if (selectedTypes.length === 1) return; // Keep at least one
      setSelectedTypes(selectedTypes.filter((t) => t !== qType));
    } else {
      setSelectedTypes([...selectedTypes, qType]);
    }
  };

  // Call server-side AI generation proxy
  const handleGenerate = async () => {
    if (!selectedCourseId || !selectedTopicId) {
      onNotify('error', 'Select both a course and topic.');
      return;
    }

    setIsGenerating(true);
    try {
      const activeCourse = courses.find((c) => c.id === selectedCourseId);
      const activeTopic = topics.find((t) => t.id === selectedTopicId);
      const activeResource = resources.find((r) => r.id === selectedResourceId);

      const payload = {
        courseTitle: activeCourse?.title,
        topicTitle: activeTopic?.title,
        sourceContent: customContext || activeResource?.contentOrUrl || activeTopic?.description,
        questionTypes: selectedTypes,
        difficulty,
        count: questionCount,
      };

      const res = await fetch('/api/ai/generate-questions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        throw new Error(`Generation service error (${res.status})`);
      }

      const data = await res.json();
      const generatedList: AICandidateQuestion[] = (data.candidates || []).map(
        (cand: any, idx: number) => ({
          id: cand.id || `cand-${Date.now()}-${idx + 1}`,
          courseId: selectedCourseId,
          topicId: selectedTopicId,
          prompt: cand.prompt,
          type: cand.type,
          difficulty: cand.difficulty || difficulty,
          points: cand.points || 2,
          explanation: cand.explanation || '',
          sourceContext: cand.sourceContext || `Curriculum topic: ${activeTopic?.title}`,
          options: cand.options,
          correctBool: cand.correctBool,
          acceptedAnswers: cand.acceptedAnswers,
          matchingPairs: cand.matchingPairs,
          expectedRubric: cand.expectedRubric,
          status: 'pending_review',
          createdAt: new Date().toISOString(),
        })
      );

      onSaveGeneratedCandidates(generatedList);
      onNotify('success', `Generated ${generatedList.length} candidate questions for review.`);
    } catch (err: any) {
      console.error('Generation error:', err);
      onNotify('error', 'Could not generate questions. Check network or settings and retry.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleApprove = (candId: string) => {
    onUpdateCandidateStatus(candId, 'approved');
    onNotify('success', 'Question approved and added to Question Bank.');
  };

  const handleRejectConfirm = () => {
    if (rejectModalId) {
      onUpdateCandidateStatus(rejectModalId, 'rejected', rejectReason);
      setRejectModalId(null);
      setRejectReason('');
      onNotify('info', 'Candidate question rejected.');
    }
  };

  const pendingList = candidates.filter((c) => c.status === 'pending_review');
  const reviewedList = candidates.filter((c) => c.status !== 'pending_review');

  return (
    <div className="space-y-8">
      <PageHeader
        title="AI Content Review"
        description="Generate candidate assessment questions from curriculum syllabus and learning materials. Every candidate requires teacher review before approval."
        primaryAction={
          <Button
            variant="secondary"
            size="sm"
            onClick={() => onNavigate('questions')}
          >
            Open Question Bank
          </Button>
        }
      />

      {/* Understated AI Visual Cue and Governance Banner */}
      <div className="p-4 rounded-xl bg-[#F4F6FF] border border-[#3156D3]/20 flex items-start gap-3.5">
        <div className="p-2 rounded-lg bg-[#E8EEFF] text-[#2646B8] shrink-0 mt-0.5">
          <Sparkles className="w-4 h-4" />
        </div>
        <div className="text-xs text-[#1F2937] leading-relaxed">
          <p className="font-bold text-[#2646B8]">
            Teacher-in-the-Loop Principle &amp; Academic Integrity
          </p>
          <p className="text-[#5B6472] mt-0.5">
            AI produces <strong>draft candidate questions</strong> based on your learning resources.
            Candidates are strictly quarantined until you review, edit, or approve them. Approved items
            are immediately stored in your Question Bank.
          </p>
        </div>
      </div>

      {/* Generation Setup Card */}
      <div className="bg-white rounded-xl border border-[#D9DEE7] p-6 shadow-2xs space-y-5">
        <div className="flex items-center justify-between pb-3 border-b border-[#D9DEE7]">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-[#3156D3]" />
            <h2 className="text-base font-bold text-[#1F2937]">Request Candidate Generation</h2>
          </div>
          <span className="text-xs text-[#737D8C]">Configured with syllabus context</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField id="gen-course" label="Target Course" required>
            <select
              id="gen-course"
              value={selectedCourseId}
              onChange={(e) => handleCourseChange(e.target.value)}
              className="w-full bg-white border border-[#D9DEE7] text-xs rounded-lg px-3 py-2.5 focus:border-[#3156D3] focus:outline-none"
            >
              {courses.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.title}
                </option>
              ))}
            </select>
          </FormField>

          <FormField id="gen-topic" label="Curriculum Topic" required>
            <select
              id="gen-topic"
              value={selectedTopicId}
              onChange={(e) => setSelectedTopicId(e.target.value)}
              className="w-full bg-white border border-[#D9DEE7] text-xs rounded-lg px-3 py-2.5 focus:border-[#3156D3] focus:outline-none"
            >
              {courseTopics.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.title}
                </option>
              ))}
            </select>
          </FormField>
        </div>

        {/* Source Learning Content */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            id="gen-resource"
            label="Source Learning Resource (Optional)"
            helperText="Anchor questions to an uploaded resource or lesson material."
          >
            <select
              id="gen-resource"
              value={selectedResourceId}
              onChange={(e) => setSelectedResourceId(e.target.value)}
              className="w-full bg-white border border-[#D9DEE7] text-xs rounded-lg px-3 py-2 focus:border-[#3156D3] focus:outline-none"
            >
              <option value="">Use Topic Syllabus Description</option>
              {topicResources.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.title} ({r.type})
                </option>
              ))}
            </select>
          </FormField>

          <FormField
            id="gen-context"
            label="Additional Custom Instructions (Optional)"
            helperText="e.g. Focus on edge cases, algorithmic time complexity, or common student mistakes."
          >
            <input
              id="gen-context"
              type="text"
              value={customContext}
              onChange={(e) => setCustomContext(e.target.value)}
              placeholder="e.g. Emphasize dictionary copy semantics"
              className="w-full bg-white border border-[#D9DEE7] text-xs rounded-lg px-3 py-2 focus:border-[#3156D3] focus:outline-none"
            />
          </FormField>
        </div>

        {/* Question Types & Difficulty Selection */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-2">
          <div className="md:col-span-2 space-y-2">
            <label className="text-xs font-semibold text-[#1F2937] block">
              Allowed Question Formats (Select one or more)
            </label>
            <div className="flex flex-wrap gap-2">
              {[
                { id: 'multiple_choice', label: 'Multiple Choice' },
                { id: 'true_false', label: 'True / False' },
                { id: 'fill_blank', label: 'Fill in Blank' },
                { id: 'matching', label: 'Matching' },
                { id: 'short_answer', label: 'Short Answer' },
              ].map((t) => {
                const isSelected = selectedTypes.includes(t.id as QuestionType);
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => handleToggleType(t.id as QuestionType)}
                    className={`px-3 py-1.5 rounded-lg border text-xs font-medium transition-colors cursor-pointer flex items-center gap-1.5 ${
                      isSelected
                        ? 'bg-[#E8EEFF] border-[#3156D3] text-[#2646B8] font-semibold'
                        : 'bg-white border-[#D9DEE7] text-[#5B6472] hover:bg-gray-50'
                    }`}
                  >
                    {isSelected ? (
                      <Check className="w-3.5 h-3.5 text-[#3156D3]" />
                    ) : (
                      <Plus className="w-3.5 h-3.5 text-gray-400" />
                    )}
                    <span>{t.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <FormField id="gen-diff" label="Difficulty">
              <select
                id="gen-diff"
                value={difficulty}
                onChange={(e) => setDifficulty(e.target.value as Difficulty)}
                className="w-full bg-white border border-[#D9DEE7] text-xs rounded-lg px-2.5 py-1.5 focus:border-[#3156D3] focus:outline-none"
              >
                <option value="easy">Easy</option>
                <option value="medium">Medium</option>
                <option value="hard">Hard</option>
              </select>
            </FormField>

            <FormField id="gen-count" label="Count">
              <select
                id="gen-count"
                value={questionCount}
                onChange={(e) => setQuestionCount(parseInt(e.target.value, 10))}
                className="w-full bg-white border border-[#D9DEE7] text-xs rounded-lg px-2.5 py-1.5 focus:border-[#3156D3] focus:outline-none"
              >
                <option value="1">1 Question</option>
                <option value="2">2 Questions</option>
                <option value="3">3 Questions</option>
                <option value="5">5 Questions</option>
              </select>
            </FormField>
          </div>
        </div>

        <div className="pt-3 border-t border-[#D9DEE7] flex justify-end">
          <Button
            variant="primary"
            leftIcon={
              isGenerating ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Sparkles className="w-4 h-4" />
              )
            }
            isLoading={isGenerating}
            onClick={handleGenerate}
          >
            {isGenerating ? 'Generating candidates...' : 'Generate candidate questions'}
          </Button>
        </div>
      </div>

      {/* Review Queue Area */}
      <div className="space-y-4">
        <div className="flex items-center justify-between pb-2 border-b border-[#D9DEE7]">
          <div className="flex items-center gap-2">
            <h2 className="text-base font-bold text-[#1F2937]">Candidate Review Queue</h2>
            <span className="text-xs font-semibold bg-[#FFF5D6] text-[#946200] px-2 py-0.5 rounded-full border border-[#946200]/30">
              {pendingList.length} Pending Review
            </span>
          </div>
          <span className="text-xs text-[#737D8C]">
            Total candidates generated: {candidates.length}
          </span>
        </div>

        {pendingList.length === 0 ? (
          <div className="bg-white rounded-xl border border-[#D9DEE7] p-8 text-center text-xs text-[#5B6472]">
            <CheckCircle2 className="w-8 h-8 text-[#18794E] mx-auto mb-2" />
            <p className="text-sm font-semibold text-[#1F2937]">
              No questions currently awaiting review
            </p>
            <p className="mt-1 max-w-md mx-auto">
              Use the generation form above to request questions, or browse already approved
              questions in the Question Bank.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {pendingList.map((cand, idx) => {
              const courseObj = courses.find((c) => c.id === cand.courseId);
              const topicObj = topics.find((t) => t.id === cand.topicId);

              return (
                <div
                  key={cand.id}
                  className="bg-white rounded-xl border border-[#D9DEE7] p-5 shadow-2xs space-y-4 hover:border-[#3156D3] transition-all"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-bold text-[#737D8C] bg-gray-100 px-2 py-0.5 rounded">
                        Candidate #{idx + 1}
                      </span>
                      <span className="text-xs font-semibold text-[#3156D3] bg-[#E8EEFF] px-2 py-0.5 rounded">
                        {cand.type.replace('_', ' ')}
                      </span>
                      <span className="text-xs font-medium text-gray-600 bg-gray-50 border px-2 py-0.5 rounded">
                        {cand.difficulty}
                      </span>
                      <span className="text-xs text-[#737D8C]">
                        {topicObj?.title} • {courseObj?.title}
                      </span>
                    </div>

                    <StatusBadge status="pending_review" />
                  </div>

                  {/* Question Prompt */}
                  <div>
                    <h3 className="text-sm font-bold text-[#1F2937] leading-relaxed">
                      {cand.prompt}
                    </h3>
                  </div>

                  {/* Answer Preview */}
                  {cand.type === 'multiple_choice' && (
                    <div className="space-y-1.5 pl-2 border-l-2 border-gray-200">
                      {(cand.options || []).map((opt, i) => (
                        <div
                          key={opt.id}
                          className={`text-xs p-2 rounded flex items-center justify-between ${
                            opt.isCorrect
                              ? 'bg-[#EAF7F0] text-[#18794E] font-medium border border-[#18794E]/30'
                              : 'text-[#5B6472] bg-gray-50'
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-[10px]">
                              {String.fromCharCode(65 + i)}.
                            </span>
                            <span>{opt.text}</span>
                          </div>
                          {opt.isCorrect && (
                            <span className="text-[10px] font-bold uppercase flex items-center gap-1">
                              <Check className="w-3 h-3" /> Correct Answer
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  {cand.type === 'true_false' && (
                    <div className="text-xs p-2.5 rounded bg-gray-50 border border-gray-200 font-semibold text-[#1F2937]">
                      Expected Answer: {cand.correctBool ? 'True' : 'False'}
                    </div>
                  )}

                  {cand.type === 'fill_blank' && (
                    <div className="text-xs p-2.5 rounded bg-gray-50 border border-gray-200">
                      <span className="text-[#5B6472]">Accepted Answers: </span>
                      <span className="font-mono font-bold text-[#18794E]">
                        {(cand.acceptedAnswers || []).join(', ')}
                      </span>
                    </div>
                  )}

                  {cand.type === 'matching' && (
                    <div className="text-xs border rounded-lg divide-y bg-gray-50">
                      {(cand.matchingPairs || []).map((pair) => (
                        <div key={pair.id} className="p-2 grid grid-cols-2">
                          <span className="font-semibold">{pair.left}</span>
                          <span className="text-[#5B6472]">{pair.right}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {cand.type === 'short_answer' && (
                    <div className="text-xs p-2.5 rounded bg-gray-50 border border-gray-200">
                      <span className="font-semibold block text-[#1F2937] mb-0.5">
                        Grading Rubric / Key Concepts:
                      </span>
                      <span className="text-[#5B6472]">{cand.expectedRubric}</span>
                    </div>
                  )}

                  {/* Pedagogical Explanation and Source Context */}
                  {cand.explanation && (
                    <div className="p-3 rounded-lg bg-[#EFF8FF] border border-[#175CD3]/20 text-xs">
                      <span className="font-bold text-[#175CD3] block mb-0.5">
                        Pedagogical Rationale:
                      </span>
                      <p className="text-[#1F2937] leading-relaxed">{cand.explanation}</p>
                    </div>
                  )}

                  {/* Actions: Edit, Approve, Reject */}
                  <div className="pt-3 border-t border-gray-100 flex items-center justify-between">
                    <span className="text-[11px] text-[#737D8C] italic">
                      Source: {cand.sourceContext || 'Curriculum Syllabus'}
                    </span>

                    <div className="flex items-center gap-2">
                      <Button
                        variant="secondary"
                        size="sm"
                        leftIcon={<Edit3 className="w-3.5 h-3.5" />}
                        onClick={() =>
                          onNavigate('question_editor', {
                            questionId: cand.id,
                          })
                        }
                      >
                        Edit candidate
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        leftIcon={<XCircle className="w-3.5 h-3.5 text-[#B42318]" />}
                        onClick={() => setRejectModalId(cand.id)}
                      >
                        Reject
                      </Button>
                      <Button
                        variant="primary"
                        size="sm"
                        leftIcon={<CheckCircle2 className="w-3.5 h-3.5" />}
                        onClick={() => handleApprove(cand.id)}
                      >
                        Approve to Bank
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Reject Reason Dialog */}
      {rejectModalId && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/45 backdrop-blur-xs"
          role="dialog"
          aria-modal="true"
        >
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-[#D9DEE7]">
            <h3 className="text-base font-bold text-[#1F2937] mb-1">Reject candidate question?</h3>
            <p className="text-xs text-[#5B6472] mb-4">
              This candidate will be flagged as rejected and discarded from the bank.
            </p>

            <FormField
              id="reject-reason"
              label="Rejection feedback / reason (Optional)"
              helperText="Note inaccuracies, poor alignment, or formatting issues."
            >
              <textarea
                id="reject-reason"
                rows={3}
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="e.g. Inaccurate premise or outside topic scope..."
                className="w-full bg-white border border-[#D9DEE7] text-xs rounded-lg px-3 py-2 focus:border-[#3156D3] focus:outline-none"
              />
            </FormField>

            <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-[#D9DEE7] mt-4">
              <Button variant="secondary" onClick={() => setRejectModalId(null)}>
                Cancel
              </Button>
              <Button variant="danger" onClick={handleRejectConfirm}>
                Reject question
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
