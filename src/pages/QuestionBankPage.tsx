import React, { useState, useMemo } from 'react';
import {
  ListChecks,
  Plus,
  Sparkles,
  Search,
  Filter,
  Eye,
  Edit3,
  Trash2,
  CheckCircle2,
  Check,
  HelpCircle,
  X,
  FileCheck,
} from 'lucide-react';
import { PageHeader } from '../components/ui/PageHeader';
import { Button } from '../components/ui/Button';
import { StatusBadge } from '../components/ui/StatusBadge';
import { SearchFilterBar, ActiveChip, FilterOption } from '../components/ui/SearchFilterBar';
import { EmptyState } from '../components/ui/EmptyState';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { QuestionData, Course, Topic, QuestionType, Difficulty } from '../types';

interface QuestionBankPageProps {
  questions: QuestionData[];
  courses: Course[];
  topics: Topic[];
  onNavigate: (page: string, params?: Record<string, string>) => void;
  onDeleteQuestion: (id: string) => void;
  onNotify: (type: 'success' | 'error' | 'info', msg: string) => void;
}

export const QuestionBankPage: React.FC<QuestionBankPageProps> = ({
  questions,
  courses,
  topics,
  onNavigate,
  onDeleteQuestion,
  onNotify,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [courseFilter, setCourseFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [difficultyFilter, setDifficultyFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const [previewQuestion, setPreviewQuestion] = useState<QuestionData | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  // Filter questions
  const filteredQuestions = useMemo(() => {
    return questions.filter((q) => {
      const matchesSearch =
        q.prompt.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (q.explanation && q.explanation.toLowerCase().includes(searchQuery.toLowerCase()));
      const matchesCourse = !courseFilter || q.courseId === courseFilter;
      const matchesType = !typeFilter || q.type === typeFilter;
      const matchesDifficulty = !difficultyFilter || q.difficulty === difficultyFilter;
      const matchesStatus = !statusFilter || q.status === statusFilter;
      return matchesSearch && matchesCourse && matchesType && matchesDifficulty && matchesStatus;
    });
  }, [questions, searchQuery, courseFilter, typeFilter, difficultyFilter, statusFilter]);

  const activeChips: ActiveChip[] = [];
  if (courseFilter) {
    const c = courses.find((course) => course.id === courseFilter);
    activeChips.push({
      id: 'course',
      label: `Course: ${c?.title || courseFilter}`,
      onRemove: () => setCourseFilter(''),
    });
  }
  if (typeFilter) {
    activeChips.push({
      id: 'type',
      label: `Type: ${typeFilter.replace('_', ' ')}`,
      onRemove: () => setTypeFilter(''),
    });
  }
  if (difficultyFilter) {
    activeChips.push({
      id: 'difficulty',
      label: `Difficulty: ${difficultyFilter}`,
      onRemove: () => setDifficultyFilter(''),
    });
  }
  if (statusFilter) {
    activeChips.push({
      id: 'status',
      label: `Status: ${statusFilter}`,
      onRemove: () => setStatusFilter(''),
    });
  }

  const filters: FilterOption[] = [
    {
      id: 'course',
      label: 'Course',
      value: courseFilter,
      onChange: setCourseFilter,
      options: courses.map((c) => ({ value: c.id, label: c.title })),
    },
    {
      id: 'type',
      label: 'Question Type',
      value: typeFilter,
      onChange: setTypeFilter,
      options: [
        { value: 'multiple_choice', label: 'Multiple Choice' },
        { value: 'true_false', label: 'True / False' },
        { value: 'fill_blank', label: 'Fill in the Blank' },
        { value: 'matching', label: 'Matching Pairs' },
        { value: 'short_answer', label: 'Short Answer' },
      ],
    },
    {
      id: 'difficulty',
      label: 'Difficulty',
      value: difficultyFilter,
      onChange: setDifficultyFilter,
      options: [
        { value: 'easy', label: 'Easy' },
        { value: 'medium', label: 'Medium' },
        { value: 'hard', label: 'Hard' },
      ],
    },
    {
      id: 'status',
      label: 'Status',
      value: statusFilter,
      onChange: setStatusFilter,
      options: [
        { value: 'approved', label: 'Approved' },
        { value: 'pending_review', label: 'Pending Review' },
        { value: 'draft', label: 'Draft' },
      ],
    },
  ];

  const handleDeleteConfirm = () => {
    if (confirmDeleteId) {
      onDeleteQuestion(confirmDeleteId);
      setConfirmDeleteId(null);
      onNotify('info', 'Question removed from question bank.');
    }
  };

  const formatTypeLabel = (type: QuestionType) => {
    switch (type) {
      case 'multiple_choice':
        return 'Multiple Choice';
      case 'true_false':
        return 'True / False';
      case 'fill_blank':
        return 'Fill in the Blank';
      case 'matching':
        return 'Matching';
      case 'short_answer':
        return 'Short Answer';
      default:
        return type;
    }
  };

  const getDifficultyBadge = (diff: Difficulty) => {
    switch (diff) {
      case 'easy':
        return (
          <span className="text-[11px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded-full">
            Easy
          </span>
        );
      case 'medium':
        return (
          <span className="text-[11px] font-medium bg-blue-50 text-blue-700 border border-blue-200 px-2 py-0.5 rounded-full">
            Medium
          </span>
        );
      case 'hard':
        return (
          <span className="text-[11px] font-medium bg-amber-50 text-amber-700 border border-amber-200 px-2 py-0.5 rounded-full">
            Hard
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Question Bank"
        description="Search, create, and organize reusable assessment items across your authorized curriculum."
        primaryAction={
          <div className="flex items-center gap-2.5">
            <Button
              variant="outline"
              leftIcon={<Sparkles className="w-4 h-4 text-[#3156D3]" />}
              onClick={() => onNavigate('ai_review')}
            >
              Generate with AI
            </Button>
            <Button
              variant="primary"
              leftIcon={<Plus className="w-4 h-4" />}
              onClick={() => onNavigate('question_editor')}
            >
              Create question
            </Button>
          </div>
        }
      />

      <SearchFilterBar
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        searchPlaceholder="Search questions by prompt or keywords..."
        filters={filters}
        activeChips={activeChips}
        onClearAll={() => {
          setSearchQuery('');
          setCourseFilter('');
          setTypeFilter('');
          setDifficultyFilter('');
          setStatusFilter('');
        }}
      />

      {filteredQuestions.length === 0 ? (
        questions.length === 0 ? (
          <EmptyState
            icon={<ListChecks className="w-6 h-6" />}
            title="Question bank is empty"
            description="Create questions manually or request candidate questions generated with the AI service under teacher review."
            actionLabel="Create question"
            onAction={() => onNavigate('question_editor')}
            secondaryAction={{
              label: 'Generate with AI',
              onClick: () => onNavigate('ai_review'),
            }}
          />
        ) : (
          <EmptyState
            icon={<Search className="w-6 h-6" />}
            title="No questions match these filters"
            description="Try clearing some filter chips or searching with broader keywords."
            actionLabel="Clear all filters"
            onAction={() => {
              setSearchQuery('');
              setCourseFilter('');
              setTypeFilter('');
              setDifficultyFilter('');
              setStatusFilter('');
            }}
          />
        )
      ) : (
        <div className="bg-white rounded-xl border border-[#D9DEE7] overflow-hidden shadow-2xs">
          {/* Desktop Table */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-[#F5F7FA] border-b border-[#D9DEE7] text-xs font-semibold text-[#5B6472]">
                  <th scope="col" className="py-3.5 px-5">Question Prompt</th>
                  <th scope="col" className="py-3.5 px-4">Topic / Course</th>
                  <th scope="col" className="py-3.5 px-3">Type</th>
                  <th scope="col" className="py-3.5 px-3">Difficulty</th>
                  <th scope="col" className="py-3.5 px-3">Status</th>
                  <th scope="col" className="py-3.5 px-4 text-center">Pts</th>
                  <th scope="col" className="py-3.5 px-5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#D9DEE7] text-sm">
                {filteredQuestions.map((q) => {
                  const courseObj = courses.find((c) => c.id === q.courseId);
                  const topicObj = topics.find((t) => t.id === q.topicId);

                  return (
                    <tr key={q.id} className="hover:bg-[#F5F7FA] transition-colors group">
                      <td className="py-4 px-5 max-w-md">
                        <button
                          onClick={() => setPreviewQuestion(q)}
                          className="font-medium text-[#1F2937] group-hover:text-[#3156D3] text-left transition-colors cursor-pointer text-xs sm:text-sm line-clamp-2"
                        >
                          {q.prompt}
                        </button>
                        {q.source === 'ai_generated' && (
                          <span className="inline-flex items-center gap-1 text-[10px] text-[#2646B8] bg-[#E8EEFF] px-1.5 py-0.2 rounded mt-1 font-medium">
                            <Sparkles className="w-2.5 h-2.5" />
                            AI Candidate (Approved)
                          </span>
                        )}
                      </td>
                      <td className="py-4 px-4 text-xs text-[#5B6472]">
                        <p className="font-semibold text-[#1F2937] truncate max-w-[160px]">
                          {topicObj?.title || 'General'}
                        </p>
                        <p className="text-[11px] text-[#737D8C] truncate max-w-[160px]">
                          {courseObj?.title || 'Course'}
                        </p>
                      </td>
                      <td className="py-4 px-3 text-xs">
                        <span className="font-medium text-[#1F2937] bg-gray-100 px-2 py-0.5 rounded border border-gray-200">
                          {formatTypeLabel(q.type)}
                        </span>
                      </td>
                      <td className="py-4 px-3">{getDifficultyBadge(q.difficulty)}</td>
                      <td className="py-4 px-3">
                        <StatusBadge status={q.status} />
                      </td>
                      <td className="py-4 px-4 text-center text-xs font-semibold text-[#1F2937]">
                        {q.points || 1}
                      </td>
                      <td className="py-4 px-5 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <Button
                            variant="ghost"
                            size="sm"
                            leftIcon={<Eye className="w-3.5 h-3.5" />}
                            onClick={() => setPreviewQuestion(q)}
                          >
                            Preview
                          </Button>
                          <button
                            onClick={() => onNavigate('question_editor', { questionId: q.id })}
                            className="p-1.5 text-[#5B6472] hover:text-[#1F2937] hover:bg-gray-100 rounded cursor-pointer transition-colors"
                            title="Edit question"
                            aria-label={`Edit ${q.prompt}`}
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => setConfirmDeleteId(q.id)}
                            className="p-1.5 text-[#5B6472] hover:text-[#B42318] hover:bg-[#FEF0EF] rounded cursor-pointer transition-colors"
                            title="Delete question"
                            aria-label={`Delete ${q.prompt}`}
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile Cards */}
          <div className="md:hidden divide-y divide-[#D9DEE7]">
            {filteredQuestions.map((q) => (
              <div key={q.id} className="p-4 space-y-2.5">
                <div className="flex items-start justify-between gap-2">
                  <span className="text-xs font-medium text-[#1F2937] bg-gray-100 px-2 py-0.5 rounded">
                    {formatTypeLabel(q.type)}
                  </span>
                  <div className="flex items-center gap-1.5">
                    {getDifficultyBadge(q.difficulty)}
                    <StatusBadge status={q.status} />
                  </div>
                </div>

                <p
                  onClick={() => setPreviewQuestion(q)}
                  className="font-medium text-xs text-[#1F2937] cursor-pointer line-clamp-3 hover:text-[#3156D3]"
                >
                  {q.prompt}
                </p>

                <div className="flex items-center justify-between text-xs text-[#737D8C] pt-1">
                  <span>{q.points || 1} pts</span>
                  <div className="flex items-center gap-2">
                    <Button variant="ghost" size="sm" onClick={() => setPreviewQuestion(q)}>
                      Preview
                    </Button>
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => onNavigate('question_editor', { questionId: q.id })}
                    >
                      Edit
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Question Preview Modal (Student View + Teacher Answer Key View) */}
      {previewQuestion && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/45 backdrop-blur-xs"
          role="dialog"
          aria-modal="true"
        >
          <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-xl border border-[#D9DEE7] max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-[#D9DEE7]">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold bg-[#E8EEFF] text-[#2646B8] px-2 py-0.5 rounded">
                  {formatTypeLabel(previewQuestion.type)}
                </span>
                <span className="text-xs text-[#737D8C]">• {previewQuestion.points || 1} pts</span>
              </div>
              <button
                onClick={() => setPreviewQuestion(null)}
                className="p-1 text-[#5B6472] hover:bg-gray-100 rounded-lg cursor-pointer"
                aria-label="Close preview"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="py-4 overflow-y-auto flex-1 space-y-4 text-xs">
              <div>
                <span className="text-[10px] uppercase font-bold text-[#737D8C] tracking-wider block mb-1">
                  Question Prompt (Student View)
                </span>
                <p className="text-sm font-semibold text-[#1F2937] leading-relaxed">
                  {previewQuestion.prompt}
                </p>
              </div>

              {/* Type-specific preview representation */}
              {previewQuestion.type === 'multiple_choice' && (
                <div className="space-y-2">
                  <span className="text-[10px] font-semibold text-[#5B6472]">Options:</span>
                  {(previewQuestion.options || []).map((opt, i) => (
                    <div
                      key={opt.id}
                      className={`p-2.5 rounded-lg border text-xs flex items-center justify-between ${
                        opt.isCorrect
                          ? 'bg-[#EAF7F0] border-[#18794E]/40 text-[#18794E] font-medium'
                          : 'bg-gray-50 border-gray-200 text-[#1F2937]'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span className="w-5 h-5 rounded-full bg-white border flex items-center justify-center font-bold text-[10px]">
                          {String.fromCharCode(65 + i)}
                        </span>
                        <span>{opt.text}</span>
                      </div>
                      {opt.isCorrect && (
                        <span className="text-[10px] uppercase font-bold text-[#18794E] flex items-center gap-1">
                          <Check className="w-3.5 h-3.5" /> Correct Answer
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {previewQuestion.type === 'true_false' && (
                <div className="space-y-2">
                  <span className="text-[10px] font-semibold text-[#5B6472]">Answer Choices:</span>
                  <div className="grid grid-cols-2 gap-3">
                    <div
                      className={`p-3 rounded-lg border text-center font-semibold flex items-center justify-center gap-1.5 ${
                        previewQuestion.correctBool === true
                          ? 'bg-[#EAF7F0] border-[#18794E] text-[#18794E]'
                          : 'bg-gray-50 border-gray-200 text-gray-500'
                      }`}
                    >
                      <span>True</span>
                      {previewQuestion.correctBool === true && (
                        <span className="text-xs font-bold flex items-center gap-0.5">
                          (<Check className="w-3.5 h-3.5 inline" /> Correct)
                        </span>
                      )}
                    </div>
                    <div
                      className={`p-3 rounded-lg border text-center font-semibold flex items-center justify-center gap-1.5 ${
                        previewQuestion.correctBool === false
                          ? 'bg-[#EAF7F0] border-[#18794E] text-[#18794E]'
                          : 'bg-gray-50 border-gray-200 text-gray-500'
                      }`}
                    >
                      <span>False</span>
                      {previewQuestion.correctBool === false && (
                        <span className="text-xs font-bold flex items-center gap-0.5">
                          (<Check className="w-3.5 h-3.5 inline" /> Correct)
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {previewQuestion.type === 'fill_blank' && (
                <div className="space-y-2 bg-[#F5F7FA] p-3 rounded-lg border border-[#D9DEE7]">
                  <span className="text-[10px] font-semibold text-[#5B6472]">Accepted Answer(s):</span>
                  <div className="flex flex-wrap gap-1.5 mt-1">
                    {(previewQuestion.acceptedAnswers || []).map((ans, i) => (
                      <span
                        key={i}
                        className="bg-white border border-[#18794E]/30 text-[#18794E] font-mono font-bold px-2 py-1 rounded"
                      >
                        {ans}
                      </span>
                    ))}
                  </div>
                  <span className="text-[10px] text-[#737D8C] block mt-1">
                    Case sensitivity: {previewQuestion.caseSensitive ? 'Enforced' : 'Case-insensitive'}
                  </span>
                </div>
              )}

              {previewQuestion.type === 'matching' && (
                <div className="space-y-2">
                  <span className="text-[10px] font-semibold text-[#5B6472]">Target Matching Pairs:</span>
                  <div className="divide-y divide-gray-100 border border-gray-200 rounded-lg overflow-hidden">
                    {(previewQuestion.matchingPairs || []).map((pair) => (
                      <div key={pair.id} className="grid grid-cols-2 p-2.5 text-xs bg-white">
                        <span className="font-semibold text-[#1F2937] pr-2 border-r">{pair.left}</span>
                        <span className="text-[#5B6472] pl-2">{pair.right}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {previewQuestion.type === 'short_answer' && (
                <div className="p-3 bg-[#F5F7FA] rounded-lg border border-[#D9DEE7] space-y-1">
                  <span className="text-[10px] font-bold text-[#5B6472] uppercase">
                    Teacher Grading Rubric &amp; Criteria:
                  </span>
                  <p className="text-xs text-[#1F2937] leading-relaxed whitespace-pre-wrap">
                    {previewQuestion.expectedRubric}
                  </p>
                </div>
              )}

              {previewQuestion.explanation && (
                <div className="p-3 rounded-lg bg-[#EFF8FF] border border-[#175CD3]/20">
                  <span className="text-[10px] font-bold text-[#175CD3] uppercase">
                    Pedagogical Explanation:
                  </span>
                  <p className="text-xs text-[#1F2937] mt-0.5 leading-relaxed">
                    {previewQuestion.explanation}
                  </p>
                </div>
              )}
            </div>

            <div className="pt-3 border-t border-[#D9DEE7] flex justify-between items-center">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  const q = previewQuestion;
                  setPreviewQuestion(null);
                  onNavigate('question_editor', { questionId: q.id });
                }}
              >
                Edit in editor
              </Button>
              <Button variant="secondary" size="sm" onClick={() => setPreviewQuestion(null)}>
                Close preview
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Question Confirmation */}
      <ConfirmDialog
        isOpen={!!confirmDeleteId}
        title="Delete question from bank?"
        consequence="This item will be permanently removed from the question repository. If it is currently used in active published assessments, grading logs will retain snapshot records."
        isDestructive
        confirmLabel="Delete question"
        onConfirm={handleDeleteConfirm}
        onCancel={() => setConfirmDeleteId(null)}
      />
    </div>
  );
};
