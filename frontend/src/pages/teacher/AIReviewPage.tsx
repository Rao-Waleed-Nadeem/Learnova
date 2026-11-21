import React, { useState, useMemo } from 'react';
import {
  Sparkles,
  CheckCircle2,
  Check,
  Plus,
  XCircle,
  Edit3,
  RotateCcw,
  BookOpen,
  Layers,
  ArrowRight,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Info,
  Clock,
  Loader2,
  FileCheck,
  Filter,
  Search,
  FileText,
  Code,
  Video,
  CheckCheck,
  X,
  Compass,
} from 'lucide-react';
import { PageHeader } from '../../components/ui/PageHeader';
import { Button } from '../../components/ui/Button';
import { FormField } from '../../components/ui/FormField';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { EmptyState } from '../../components/ui/EmptyState';
import {
  Course,
  Topic,
  Lesson,
  LearningResource,
  AICandidateQuestion,
  QuestionType,
  Difficulty,
} from '../../types';
import { aiApi } from '../../services/api/aiApi';

interface AIReviewPageProps {
  courses: Course[];
  topics: Topic[];
  lessons: Lesson[];
  resources: LearningResource[];
  candidates: AICandidateQuestion[];
  initialCourseId?: string;
  initialTopicId?: string;
  initialLessonId?: string;
  onNavigate: (page: string, params?: Record<string, string>) => void;
  onSaveGeneratedCandidates: (candidates: AICandidateQuestion[]) => void;
  onUpdateCandidateStatus: (
    id: string,
    status: 'approved' | 'rejected',
    reason?: string
  ) => void;
  onDeleteCandidate?: (id: string) => void;
  onNotify: (type: 'success' | 'error' | 'info', msg: string) => void;
}

export const AIReviewPage: React.FC<AIReviewPageProps> = ({
  courses,
  topics,
  lessons,
  resources,
  candidates,
  initialCourseId,
  initialTopicId,
  initialLessonId,
  onNavigate,
  onSaveGeneratedCandidates,
  onUpdateCandidateStatus,
  onDeleteCandidate,
  onNotify,
}) => {
  // ==========================================
  // HIERARCHY LEVEL 1: Select Course
  // ==========================================
  const teacherCourses = useMemo(() => {
    return courses;
  }, [courses]);

  const [selectedCourseId, setSelectedCourseId] = useState<string>(
    initialCourseId || teacherCourses[0]?.id || courses[0]?.id || ''
  );

  const activeCourse = useMemo(() => {
    return courses.find((c) => c.id === selectedCourseId) || courses[0];
  }, [courses, selectedCourseId]);

  // ==========================================
  // HIERARCHY LEVEL 2: Select Topic (within Course)
  // ==========================================
  const courseTopics = useMemo(() => {
    return topics
      .filter((t) => t.courseId === selectedCourseId)
      .sort((a, b) => a.order - b.order);
  }, [topics, selectedCourseId]);

  const [selectedTopicId, setSelectedTopicId] = useState<string>(() => {
    if (initialTopicId && courseTopics.some((t) => t.id === initialTopicId)) {
      return initialTopicId;
    }
    return courseTopics[0]?.id || '';
  });

  const activeTopic = useMemo(() => {
    return courseTopics.find((t) => t.id === selectedTopicId) || courseTopics[0];
  }, [courseTopics, selectedTopicId]);

  // ==========================================
  // HIERARCHY LEVEL 3: Select Lesson (within Topic)
  // ==========================================
  const topicLessons = useMemo(() => {
    if (!selectedTopicId) return [];
    return lessons
      .filter((l) => l.topicId === selectedTopicId && l.courseId === selectedCourseId)
      .sort((a, b) => a.order - b.order);
  }, [lessons, selectedTopicId, selectedCourseId]);

  const [selectedLessonId, setSelectedLessonId] = useState<string>(() => {
    if (initialLessonId && topicLessons.some((l) => l.id === initialLessonId)) {
      return initialLessonId;
    }
    return topicLessons[0]?.id || '';
  });

  const activeLesson = useMemo(() => {
    return topicLessons.find((l) => l.id === selectedLessonId) || topicLessons[0];
  }, [topicLessons, selectedLessonId]);

  // ==========================================
  // HIERARCHY LEVEL 4: Resources strictly for selected Lesson
  // ==========================================
  const lessonResources = useMemo(() => {
    if (!selectedLessonId) return [];
    return resources.filter((r) => r.lessonId === selectedLessonId);
  }, [resources, selectedLessonId]);

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

  // Bulk reject modal state
  const [bulkRejectModalOpen, setBulkRejectModalOpen] = useState(false);
  const [bulkRejectReason, setBulkRejectReason] = useState('');

  // Candidate review filters and sorting states
  const [candidateSearchQuery, setCandidateSearchQuery] = useState('');
  const [candidateStatusFilter, setCandidateStatusFilter] = useState<'all' | 'pending_review' | 'approved' | 'rejected'>('all');
  const [candidateTypeFilter, setCandidateTypeFilter] = useState<string>('all');
  const [candidateDifficultyFilter, setCandidateDifficultyFilter] = useState<string>('all');
  const [candidateLessonScope, setCandidateLessonScope] = useState<'all' | 'current_lesson'>('all');
  const [sortField, setSortField] = useState<'date' | 'difficulty' | 'points' | 'type'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // Persistent AGY session state for iterative question refinement
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [refinementPrompt, setRefinementPrompt] = useState('');
  const [isRefining, setIsRefining] = useState(false);

  // When Course changes: select first topic of new course and first lesson of that topic
  const handleCourseChange = (id: string) => {
    setSelectedCourseId(id);
    setSessionId(null);

    const newTopics = topics
      .filter((t) => t.courseId === id)
      .sort((a, b) => a.order - b.order);
    const firstTopicId = newTopics[0]?.id || '';
    setSelectedTopicId(firstTopicId);

    const newLessons = lessons
      .filter((l) => l.topicId === firstTopicId && l.courseId === id)
      .sort((a, b) => a.order - b.order);
    setSelectedLessonId(newLessons[0]?.id || '');
    setSelectedResourceId('');
  };

  // When Topic changes: select first lesson of that topic
  const handleTopicChange = (topicId: string) => {
    setSelectedTopicId(topicId);
    setSessionId(null);

    const newLessons = lessons
      .filter((l) => l.topicId === topicId && l.courseId === selectedCourseId)
      .sort((a, b) => a.order - b.order);
    setSelectedLessonId(newLessons[0]?.id || '');
    setSelectedResourceId('');
  };

  // When Lesson changes: reset resource
  const handleLessonChange = (lessonId: string) => {
    setSelectedLessonId(lessonId);
    setSelectedResourceId('');
    setSessionId(null);
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
    if (!selectedCourseId) {
      onNotify('error', 'Please select a course.');
      return;
    }
    if (!selectedTopicId) {
      onNotify('error', 'Please select a topic.');
      return;
    }
    if (!selectedLessonId) {
      onNotify('error', 'Please select a lesson.');
      return;
    }

    setIsGenerating(true);
    try {
      const activeRes = lessonResources.find((r) => r.id === selectedResourceId);
      const sourceContent =
        customContext ||
        activeRes?.contentOrUrl ||
        activeLesson?.description ||
        activeTopic?.description ||
        '';

      const payload = {
        courseTitle: activeCourse?.title,
        topicTitle: activeTopic?.title,
        lessonTitle: activeLesson?.title,
        sourceContent,
        questionTypes: selectedTypes,
        difficulty,
        count: questionCount,
      };

      let generatedList: AICandidateQuestion[] = [];

      try {
        const backendCandidates = await aiApi.generateQuestions({
          course_id: selectedCourseId,
          topic_id: selectedTopicId,
          source_content: sourceContent,
          question_types: selectedTypes,
          difficulty,
          count: questionCount,
        });

        generatedList = backendCandidates.map((cand) => ({
          id: cand.id,
          courseId: cand.course_id,
          topicId: cand.topic_id,
          lessonId: selectedLessonId,
          prompt: cand.prompt,
          type: cand.type as QuestionType,
          difficulty: cand.difficulty,
          points: cand.points,
          explanation: cand.explanation || '',
          sourceContext:
            cand.source_context ||
            `Topic: ${activeTopic?.title} • Lesson: ${activeLesson?.title || 'General'}`,
          options: cand.payload?.options,
          correctBool: cand.answer_key?.correct_bool,
          acceptedAnswers: cand.answer_key?.accepted_answers,
          matchingPairs: cand.payload?.matching_pairs,
          expectedRubric: cand.answer_key?.expected_rubric,
          status: 'pending_review',
          createdAt: cand.created_at,
        }));
      } catch (fastApiErr) {
        // Fallback: Express proxy
        const res = await fetch('/api/ai/generate-questions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ...payload,
            course_id: selectedCourseId,
            topic_id: selectedTopicId,
          }),
        });

        if (!res.ok) {
          throw new Error(`Generation service error (${res.status})`);
        }

        const data = await res.json();
        generatedList = (data.candidates || []).map(
          (cand: any, idx: number) => ({
            id: cand.id || `cand-${Date.now()}-${idx + 1}`,
            courseId: selectedCourseId,
            topicId: selectedTopicId,
            lessonId: selectedLessonId,
            prompt: cand.prompt,
            type: cand.type,
            difficulty: cand.difficulty || difficulty,
            points: cand.points || 2,
            explanation: cand.explanation || '',
            sourceContext:
              cand.sourceContext ||
              `Topic: ${activeTopic?.title} • Lesson: ${activeLesson?.title || 'General'}`,
            options: cand.options,
            correctBool: cand.correctBool,
            acceptedAnswers: cand.acceptedAnswers,
            matchingPairs: cand.matchingPairs,
            expectedRubric: cand.expectedRubric,
            status: 'pending_review',
            createdAt: new Date().toISOString(),
          })
        );
      }

      onSaveGeneratedCandidates(generatedList);
      onNotify('success', `Generated ${generatedList.length} candidate questions for review.`);
    } catch (err: any) {
      console.error('Generation error:', err);
      onNotify('error', 'Could not generate questions. Check connection and retry.');
    } finally {
      setIsGenerating(false);
    }
  };

  // Refine questions via AGY agent
  const handleRefineSession = async () => {
    if (!refinementPrompt.trim() || isRefining) return;
    setIsRefining(true);
    try {
      let currentSessId = sessionId;
      if (!currentSessId) {
        const sess = await aiApi.getOrCreateSession({
          session_type: 'question_generation',
          course_id: selectedCourseId,
          topic_id: selectedTopicId,
          title: `Question Generation: ${activeTopic?.title || 'Topic'} - ${activeLesson?.title || 'Lesson'}`,
        });
        currentSessId = sess.id;
        setSessionId(sess.id);
      }

      await aiApi.sendSessionMessage(currentSessId, {
        content: refinementPrompt,
        mode: 'refine_questions',
      });

      // Reload fresh candidates
      if (selectedTopicId) {
        const res = await aiApi.listCandidates(selectedCourseId, selectedTopicId, 'pending_review');
        const mapped: AICandidateQuestion[] = res.items.map((cand) => ({
          id: cand.id,
          courseId: cand.course_id,
          topicId: cand.topic_id,
          lessonId: selectedLessonId,
          prompt: cand.prompt,
          type: cand.type as QuestionType,
          difficulty: cand.difficulty,
          points: cand.points,
          explanation: cand.explanation || '',
          sourceContext: cand.source_context || '',
          options: cand.payload?.options,
          correctBool: cand.answer_key?.correct_bool,
          acceptedAnswers: cand.answer_key?.accepted_answers,
          matchingPairs: cand.payload?.matching_pairs,
          expectedRubric: cand.answer_key?.expected_rubric,
          status: cand.status as 'pending_review',
          createdAt: cand.created_at,
        }));
        onSaveGeneratedCandidates(mapped);
      }
      setRefinementPrompt('');
      onNotify('success', 'AGY agent refined questions in the active session.');
    } catch (err: any) {
      console.error('Refinement error:', err);
      onNotify('error', err?.message || 'Could not refine questions in session.');
    } finally {
      setIsRefining(false);
    }
  };

  const handleApprove = async (candId: string) => {
    try {
      await aiApi.approveCandidate(candId);
    } catch (err) {
      console.warn('Backend approval sync notice:', err);
    }
    onUpdateCandidateStatus(candId, 'approved');
    onNotify('success', 'Question approved and added to Question Bank.');
  };

  const handleRejectConfirm = async () => {
    if (rejectModalId) {
      try {
        await aiApi.rejectCandidate(rejectModalId, rejectReason);
      } catch (err) {
        console.warn('Backend rejection sync notice:', err);
      }
      onUpdateCandidateStatus(rejectModalId, 'rejected', rejectReason);
      setRejectModalId(null);
      setRejectReason('');
      onNotify('info', 'Candidate question rejected.');
    }
  };

  // Bulk Reject All Pending Candidates
  const handleBulkRejectConfirm = async () => {
    const pendingToReject = candidates.filter(
      (c) => c.courseId === selectedCourseId && c.status === 'pending_review'
    );

    if (pendingToReject.length === 0) {
      setBulkRejectModalOpen(false);
      return;
    }

    for (const cand of pendingToReject) {
      try {
        await aiApi.rejectCandidate(cand.id, bulkRejectReason || 'Bulk rejected by teacher');
      } catch (err) {
        // Fallback
      }
      onUpdateCandidateStatus(cand.id, 'rejected', bulkRejectReason || 'Bulk rejected by teacher');
    }

    onNotify('info', `Rejected all ${pendingToReject.length} pending candidate question(s).`);
    setBulkRejectModalOpen(false);
    setBulkRejectReason('');
  };

  // Bulk Approve All Pending Candidates
  const handleBulkApproveAll = async () => {
    const pendingToApprove = candidates.filter(
      (c) => c.courseId === selectedCourseId && c.status === 'pending_review'
    );

    if (pendingToApprove.length === 0) return;

    for (const cand of pendingToApprove) {
      try {
        await aiApi.approveCandidate(cand.id);
      } catch (err) {
        // Fallback
      }
      onUpdateCandidateStatus(cand.id, 'approved');
    }

    onNotify('success', `Approved all ${pendingToApprove.length} pending question(s) to Question Bank.`);
  };

  // Single Candidate Removal (Cross 'X' button)
  const handleRemoveCandidate = (id: string) => {
    if (onDeleteCandidate) {
      onDeleteCandidate(id);
    }
  };

  // Remove All Candidates for Course
  const handleRemoveAllCourseCandidates = () => {
    const toRemove = candidates.filter((c) => c.courseId === selectedCourseId);
    if (onDeleteCandidate && toRemove.length > 0) {
      for (const cand of toRemove) {
        onDeleteCandidate(cand.id);
      }
    }
  };

  // Filtered and Sorted Candidates List
  const filteredAndSortedCandidates = useMemo(() => {
    let list = candidates.filter((c) => c.courseId === selectedCourseId);

    // Search query filter
    if (candidateSearchQuery.trim()) {
      const q = candidateSearchQuery.toLowerCase();
      list = list.filter(
        (c) =>
          c.prompt.toLowerCase().includes(q) ||
          (c.explanation && c.explanation.toLowerCase().includes(q)) ||
          (c.sourceContext && c.sourceContext.toLowerCase().includes(q))
      );
    }

    // Status filter
    if (candidateStatusFilter !== 'all') {
      list = list.filter((c) => c.status === candidateStatusFilter);
    }

    // Question type filter
    if (candidateTypeFilter !== 'all') {
      list = list.filter((c) => c.type === candidateTypeFilter);
    }

    // Difficulty filter
    if (candidateDifficultyFilter !== 'all') {
      list = list.filter((c) => c.difficulty === candidateDifficultyFilter);
    }

    // Lesson scope filter
    if (candidateLessonScope === 'current_lesson' && selectedLessonId) {
      list = list.filter((c) => c.lessonId === selectedLessonId);
    }

    // Sorting
    const diffScore = { easy: 1, medium: 2, hard: 3 };
    list = [...list].sort((a, b) => {
      let comparison = 0;
      if (sortField === 'date') {
        const dateA = new Date(a.createdAt).getTime();
        const dateB = new Date(b.createdAt).getTime();
        comparison = dateA - dateB;
      } else if (sortField === 'difficulty') {
        comparison = diffScore[a.difficulty] - diffScore[b.difficulty];
      } else if (sortField === 'points') {
        comparison = (a.points || 1) - (b.points || 1);
      } else if (sortField === 'type') {
        comparison = a.type.localeCompare(b.type);
      }

      return sortOrder === 'asc' ? comparison : -comparison;
    });

    return list;
  }, [
    candidates,
    selectedCourseId,
    candidateSearchQuery,
    candidateStatusFilter,
    candidateTypeFilter,
    candidateDifficultyFilter,
    candidateLessonScope,
    selectedLessonId,
    sortField,
    sortOrder,
  ]);

  const coursePendingCandidates = useMemo(() => {
    return candidates.filter((c) => c.courseId === selectedCourseId && c.status === 'pending_review');
  }, [candidates, selectedCourseId]);

  return (
    <div className="space-y-8">
      <PageHeader
        title="AI Content Review"
        description="Generate candidate assessment questions using the curriculum hierarchy: Course -> Topic -> Lesson. Candidates require teacher review before promotion into the Question Bank."
        primaryAction={
          <Button
            variant="secondary"
            size="sm"
            onClick={() =>
              onNavigate('questions', {
                courseId: selectedCourseId,
                topicId: selectedTopicId,
                lessonId: selectedLessonId,
              })
            }
          >
            Open Question Bank
          </Button>
        }
      />

      {/* Governance Banner */}
      <div className="p-4 rounded-xl bg-[#F4F6FF] dark:bg-indigo-950/30 border border-[#3156D3]/20 dark:border-indigo-800/40 flex items-start gap-3.5">
        <div className="p-2 rounded-lg bg-[#E8EEFF] dark:bg-indigo-900/40 text-[#2646B8] dark:text-indigo-300 shrink-0 mt-0.5">
          <Sparkles className="w-4 h-4" />
        </div>
        <div className="text-xs text-[#1F2937] dark:text-white leading-relaxed">
          <p className="font-bold text-[#2646B8]">
            Curriculum Hierarchy &amp; Teacher-in-the-Loop Governance
          </p>
          <p className="text-[#5B6472] dark:text-gray-400 mt-0.5">
            Strict hierarchy: <strong>1. Course</strong> → <strong>2. Topic</strong> → <strong>3. Lesson</strong>.
            Questions generated are anchored to the specific lesson and its learning resources.
            Candidates remain quarantined until approved.
          </p>
        </div>
      </div>

      {/* ==================================================== */}
      {/* STEP 1: Select Course                                */}
      {/* ==================================================== */}
      <div className="bg-white dark:bg-[#181C24] rounded-xl border border-[#D9DEE7] dark:border-[#2D3545] p-5 shadow-2xs space-y-3.5">
        <div className="flex items-center justify-between pb-2 border-b border-[#D9DEE7] dark:border-[#2D3545]">
          <div className="flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-[#3156D3] text-white flex items-center justify-center text-xs font-bold">
              1
            </span>
            <BookOpen className="w-4 h-4 text-[#3156D3]" />
            <h2 className="text-sm font-bold text-[#1F2937] dark:text-white">Step 1: Select Course</h2>
          </div>
          <span className="text-[11px] text-[#737D8C] dark:text-gray-400">
            Curriculum Oversight & Question Generation
          </span>
        </div>

        <p className="text-xs text-[#5B6472] dark:text-gray-400">
          Choose the course you want to author or generate assessment questions for:
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {courses.map((c) => {
            const isSelected = c.id === selectedCourseId;
            const isAssigned = true;
            const topicCount = topics.filter((t) => t.courseId === c.id).length;
            const lessonCount = lessons.filter((l) => l.courseId === c.id).length;
            const pendingCount = candidates.filter(
              (cand) => cand.courseId === c.id && cand.status === 'pending_review'
            ).length;

            return (
              <button
                key={c.id}
                type="button"
                onClick={() => handleCourseChange(c.id)}
                className={`text-left p-3.5 rounded-xl border transition-all cursor-pointer flex flex-col justify-between ${
                  isSelected
                    ? 'border-[#3156D3] bg-[#F4F6FF] dark:bg-indigo-950/40 ring-2 ring-[#3156D3]/20 shadow-xs'
                    : 'border-[#D9DEE7] bg-white hover:border-gray-300 hover:bg-gray-50 dark:bg-[#1C212B]/50'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between gap-1 mb-1">
                    <span
                      className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                        isAssigned
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : 'bg-gray-100 text-gray-600'
                      }`}
                    >
                      {isAssigned ? 'My Course' : 'Authorized'}
                    </span>
                    {pendingCount > 0 && (
                      <span className="text-[10px] font-bold bg-[#FFF5D6] text-[#946200] px-1.5 py-0.2 rounded border border-[#946200]/30">
                        {pendingCount} Pending
                      </span>
                    )}
                  </div>
                  <h3 className="text-xs font-bold text-[#1F2937] dark:text-white line-clamp-2 mt-1">
                    {c.title}
                  </h3>
                </div>

                <div className="mt-3 pt-2 border-t border-gray-100 flex items-center justify-between text-[11px] text-[#737D8C] dark:text-gray-400">
                  <span>
                    {topicCount} Topics • {lessonCount} Lessons
                  </span>
                  <span className={`font-semibold ${isSelected ? 'text-[#3156D3]' : 'text-gray-400'}`}>
                    {isSelected ? 'Selected ✓' : 'Select →'}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* ==================================================== */}
      {/* STEP 2: Select Topic (within chosen Course)          */}
      {/* ==================================================== */}
      <div className="bg-white dark:bg-[#181C24] rounded-xl border border-[#D9DEE7] dark:border-[#2D3545] p-5 shadow-2xs space-y-3.5">
        <div className="flex items-center justify-between pb-2 border-b border-[#D9DEE7] dark:border-[#2D3545]">
          <div className="flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-[#3156D3] text-white flex items-center justify-center text-xs font-bold">
              2
            </span>
            <Layers className="w-4 h-4 text-[#3156D3]" />
            <h2 className="text-sm font-bold text-[#1F2937] dark:text-white">
              Step 2: Select Curriculum Topic in "{activeCourse?.title}"
            </h2>
          </div>
          <span className="text-xs text-[#737D8C] dark:text-gray-400">
            {courseTopics.length} topic{courseTopics.length !== 1 ? 's' : ''} available
          </span>
        </div>

        <p className="text-xs text-[#5B6472] dark:text-gray-400">
          Choose the pedagogical topic under which the target lesson belongs:
        </p>

        {courseTopics.length === 0 ? (
          <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-800">
            No topics defined for this course yet. Please define curriculum topics in Curriculum Editor.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {courseTopics.map((t) => {
              const isSelected = t.id === selectedTopicId;
              const lessonCount = lessons.filter(
                (l) => l.topicId === t.id && l.courseId === selectedCourseId
              ).length;

              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => handleTopicChange(t.id)}
                  className={`text-left p-3.5 rounded-xl border transition-all cursor-pointer flex flex-col justify-between ${
                    isSelected
                      ? 'border-[#3156D3] bg-[#E8EEFF] text-[#1F2937] dark:text-white ring-2 ring-[#3156D3]/20 font-semibold'
                      : 'border-[#D9DEE7] bg-white text-[#5B6472] dark:text-gray-400 hover:bg-gray-50 dark:bg-[#1C212B]'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between gap-1 mb-1">
                      <span className="text-[10px] font-bold text-[#3156D3] dark:text-indigo-300 bg-white dark:bg-[#12161F] px-2 py-0.5 rounded border border-[#3156D3]/30 dark:border-indigo-800/40">
                        Topic {t.order}
                      </span>
                      <span className="text-[10px] text-[#737D8C] dark:text-gray-400">{lessonCount} Lessons</span>
                    </div>
                    <h4 className="text-xs font-bold text-[#1F2937] dark:text-white line-clamp-1 mt-1">{t.title}</h4>
                    <p className="text-[11px] text-[#737D8C] dark:text-gray-400 line-clamp-2 mt-1">
                      {t.description || 'Curriculum unit'}
                    </p>
                  </div>

                  <div className="mt-2.5 pt-2 border-t border-gray-100 flex items-center justify-between text-[11px]">
                    <span className="text-[#737D8C] dark:text-gray-400">Mastery: {t.masteryThreshold || 75}%</span>
                    <span className={`font-semibold ${isSelected ? 'text-[#3156D3]' : 'text-gray-400'}`}>
                      {isSelected ? 'Active Topic ✓' : 'Select →'}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* ==================================================== */}
      {/* STEP 3: Select Lesson (within chosen Topic)          */}
      {/* ==================================================== */}
      <div className="bg-white dark:bg-[#181C24] rounded-xl border border-[#D9DEE7] dark:border-[#2D3545] p-5 shadow-2xs space-y-3.5">
        <div className="flex items-center justify-between pb-2 border-b border-[#D9DEE7] dark:border-[#2D3545]">
          <div className="flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-[#3156D3] text-white flex items-center justify-center text-xs font-bold">
              3
            </span>
            <Compass className="w-4 h-4 text-[#3156D3]" />
            <h2 className="text-sm font-bold text-[#1F2937] dark:text-white">
              Step 3: Select Lesson in "{activeTopic?.title || 'Selected Topic'}"
            </h2>
          </div>
          <span className="text-xs text-[#737D8C] dark:text-gray-400">
            Topic: <strong className="text-[#3156D3]">{activeTopic?.title}</strong>
          </span>
        </div>

        <p className="text-xs text-[#5B6472] dark:text-gray-400">
          Choose the specific lesson to target. Learning materials and question candidates will be anchored to this lesson:
        </p>

        {topicLessons.length === 0 ? (
          <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-800">
            No lessons found for this topic. Add lessons for "{activeTopic?.title}" in the Curriculum Editor.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {topicLessons.map((l) => {
              const isSelected = l.id === selectedLessonId;
              const resCount = resources.filter((r) => r.lessonId === l.id).length;

              return (
                <button
                  key={l.id}
                  type="button"
                  onClick={() => handleLessonChange(l.id)}
                  className={`text-left p-3.5 rounded-xl border transition-all cursor-pointer flex flex-col justify-between ${
                    isSelected
                      ? 'border-[#3156D3] bg-[#E8EEFF] text-[#1F2937] dark:text-white ring-2 ring-[#3156D3]/20 font-semibold'
                      : 'border-[#D9DEE7] bg-white text-[#5B6472] dark:text-gray-400 hover:bg-gray-50 dark:bg-[#1C212B]'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between gap-1 mb-1">
                      <span className="text-[10px] font-bold text-[#3156D3] dark:text-indigo-300 bg-white dark:bg-[#12161F] px-2 py-0.5 rounded border border-[#3156D3]/30 dark:border-indigo-800/40">
                        Lesson {l.order}
                      </span>
                      <span className="text-[10px] text-[#737D8C] dark:text-gray-400">
                        {resCount} Resource{resCount !== 1 ? 's' : ''}
                      </span>
                    </div>
                    <h4 className="text-xs font-bold text-[#1F2937] dark:text-white line-clamp-2 mt-1">{l.title}</h4>
                    <p className="text-[11px] text-[#737D8C] dark:text-gray-400 line-clamp-2 mt-1">
                      {l.description || 'Lesson materials and concepts.'}
                    </p>
                  </div>

                  <div className="mt-2.5 pt-2 border-t border-gray-100 flex items-center justify-between text-[11px]">
                    <span className="text-[#737D8C] dark:text-gray-400">
                      {resCount > 0 ? `${resCount} file(s) available` : 'Description text only'}
                    </span>
                    <span className={`font-semibold ${isSelected ? 'text-[#3156D3]' : 'text-gray-400'}`}>
                      {isSelected ? 'Active Lesson ✓' : 'Select →'}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* ==================================================== */}
      {/* STEP 4: Resource Input & Generation Form             */}
      {/* ==================================================== */}
      <div className="bg-white dark:bg-[#181C24] rounded-xl border border-[#D9DEE7] dark:border-[#2D3545] p-6 shadow-2xs space-y-5">
        <div className="flex items-center justify-between pb-3 border-b border-[#D9DEE7] dark:border-[#2D3545]">
          <div className="flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-[#3156D3] text-white flex items-center justify-center text-xs font-bold">
              4
            </span>
            <Sparkles className="w-4 h-4 text-[#3156D3]" />
            <h2 className="text-base font-bold text-[#1F2937] dark:text-white">
              Step 4: Resource &amp; Question Generation Settings
            </h2>
          </div>
          <span className="text-xs text-[#737D8C] dark:text-gray-400">
            Targeting: <strong className="text-[#3156D3]">{activeTopic?.title}</strong> →{' '}
            <strong className="text-[#1F2937] dark:text-white">{activeLesson?.title || 'Lesson'}</strong>
          </span>
        </div>

        {/* Resource Selection Filtered Strictly to Chosen Lesson */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            id="gen-resource"
            label="Lesson Learning Resource (Anchored Input)"
            helperText="Showing only materials belonging to the selected lesson."
          >
            <select
              id="gen-resource"
              value={selectedResourceId}
              onChange={(e) => setSelectedResourceId(e.target.value)}
              className="w-full bg-white dark:bg-[#12161F] border border-[#D9DEE7] dark:border-[#2D3545] text-xs rounded-lg px-3 py-2 dark:text-white.5 focus:border-[#3156D3] focus:outline-none"
            >
              <option value="">
                Use Lesson Description: {activeLesson ? `"${activeLesson.title}"` : 'Syllabus Text'}
              </option>
              {lessonResources.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.title} ({r.type.toUpperCase()})
                </option>
              ))}
            </select>
            {lessonResources.length === 0 && (
              <p className="text-[11px] text-amber-700 bg-amber-50 border border-amber-200/60 p-2 rounded-lg mt-1.5">
                No uploaded files attached to this lesson. Questions will be generated from the lesson description and topic syllabus.
              </p>
            )}
          </FormField>

          <FormField
            id="gen-context"
            label="Prompt &amp; Custom Instructions (Optional)"
            helperText="Guide question generation (e.g. edge cases, common student pitfalls, time complexity)."
          >
            <input
              id="gen-context"
              type="text"
              value={customContext}
              onChange={(e) => setCustomContext(e.target.value)}
              placeholder="e.g. Emphasize dictionary copy semantics and immutable keys..."
              className="w-full bg-white dark:bg-[#12161F] border border-[#D9DEE7] dark:border-[#2D3545] text-xs rounded-lg px-3 py-2 dark:text-white.5 focus:border-[#3156D3] focus:outline-none"
            />
          </FormField>
        </div>

        {/* Allowed Question Formats & Difficulty */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-2">
          <div className="md:col-span-2 space-y-2">
            <label className="text-xs font-semibold text-[#1F2937] dark:text-white block">
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
                        ? 'bg-[#E8EEFF] dark:bg-indigo-950/40 border-[#3156D3] text-[#2646B8] dark:text-indigo-300 font-semibold'
                        : 'bg-white border-[#D9DEE7] text-[#5B6472] dark:text-gray-400 hover:bg-gray-50 dark:bg-[#1C212B]'
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

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <FormField id="gen-diff" label="Difficulty">
              <select
                id="gen-diff"
                value={difficulty}
                onChange={(e) => setDifficulty(e.target.value as Difficulty)}
                className="w-full bg-white dark:bg-[#12161F] border border-[#D9DEE7] dark:border-[#2D3545] text-xs rounded-lg px-2.5 py-1.5 dark:text-white focus:border-[#3156D3] focus:outline-none"
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
                className="w-full bg-white dark:bg-[#12161F] border border-[#D9DEE7] dark:border-[#2D3545] text-xs rounded-lg px-2.5 py-1.5 dark:text-white focus:border-[#3156D3] focus:outline-none"
              >
                <option value="1">1 Question</option>
                <option value="2">2 Questions</option>
                <option value="3">3 Questions</option>
                <option value="5">5 Questions</option>
              </select>
            </FormField>
          </div>
        </div>

        <div className="pt-3 border-t border-[#D9DEE7] dark:border-[#2D3545] flex justify-end items-center gap-3">
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

      {/* ==================================================== */}
      {/* CANDIDATE REVIEW QUEUE                               */}
      {/* ==================================================== */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-2 border-b border-[#D9DEE7] dark:border-[#2D3545]">
          <div className="flex items-center gap-2.5">
            <h2 className="text-base font-bold text-[#1F2937] dark:text-white">Candidate Review Queue</h2>
            <span className="text-xs font-semibold bg-[#FFF5D6] text-[#946200] px-2.5 py-0.5 rounded-full border border-[#946200]/30">
              {coursePendingCandidates.length} Pending Review
            </span>
          </div>

          {/* Quick Bulk Actions */}
          <div className="flex items-center gap-2">
            {filteredAndSortedCandidates.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                leftIcon={<X className="w-3.5 h-3.5 text-gray-500" />}
                onClick={handleRemoveAllCourseCandidates}
                title="Remove all candidate questions from page"
              >
                Clear All
              </Button>
            )}
            {coursePendingCandidates.length > 0 && (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  leftIcon={<CheckCheck className="w-3.5 h-3.5 text-emerald-600" />}
                  onClick={handleBulkApproveAll}
                >
                  Approve All Pending
                </Button>
                <Button
                  variant="danger"
                  size="sm"
                  leftIcon={<XCircle className="w-3.5 h-3.5" />}
                  onClick={() => setBulkRejectModalOpen(true)}
                >
                  Reject All ({coursePendingCandidates.length})
                </Button>
              </>
            )}
          </div>
        </div>

        {/* Iterative AGY Persistent Session Refinement Bar */}
        <div className="bg-[#F8FAFC] border border-[#D9DEE7] dark:border-[#2D3545] rounded-xl p-3.5 space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="w-3.5 h-3.5 text-[#3156D3]" />
              <span className="text-xs font-bold text-[#1F2937] dark:text-white">
                Iterative Question Refinement (Persistent AGY Session)
              </span>
            </div>
            <span className="text-[11px] text-[#737D8C] dark:text-gray-400">
              Refine questions or add new formats in the same conversation
            </span>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={refinementPrompt}
              onChange={(e) => setRefinementPrompt(e.target.value)}
              placeholder="e.g. 'Make question 2 harder', 'Add 2 fill-in-the-blank questions', 'Replace option D with a trickier distractor'..."
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleRefineSession();
                }
              }}
              disabled={isRefining}
              className="flex-1 bg-white dark:bg-[#12161F] border border-[#D9DEE7] dark:border-[#2D3545] text-xs rounded-lg px-3 py-2 dark:text-white focus:border-[#3156D3] focus:outline-none"
            />
            <Button
              variant="secondary"
              isLoading={isRefining}
              disabled={!refinementPrompt.trim() || isRefining}
              onClick={handleRefineSession}
              leftIcon={<Sparkles className="w-3.5 h-3.5 text-[#3156D3]" />}
            >
              {isRefining ? 'Refining...' : 'Refine with AGY'}
            </Button>
          </div>
        </div>

        {/* CANDIDATE FILTERS & SORTING CONTROLS */}
        <div className="bg-white dark:bg-[#181C24] rounded-xl border border-[#D9DEE7] dark:border-[#2D3545] p-4 shadow-2xs space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            {/* Search Input */}
            <div className="md:col-span-2 relative">
              <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={candidateSearchQuery}
                onChange={(e) => setCandidateSearchQuery(e.target.value)}
                placeholder="Filter candidates by prompt or keyword..."
                className="w-full pl-9 pr-3 py-2 bg-white dark:bg-[#12161F] border border-[#D9DEE7] dark:border-[#2D3545] rounded-lg text-xs dark:text-white focus:border-[#3156D3] focus:outline-none"
              />
            </div>

            {/* Status Filter */}
            <div>
              <select
                value={candidateStatusFilter}
                onChange={(e) => setCandidateStatusFilter(e.target.value as any)}
                className="w-full bg-white dark:bg-[#12161F] border border-[#D9DEE7] dark:border-[#2D3545] text-xs rounded-lg px-3 py-2 dark:text-white focus:border-[#3156D3] focus:outline-none"
              >
                <option value="all">All Statuses</option>
                <option value="pending_review">Pending Review Only</option>
                <option value="approved">Approved</option>
                <option value="rejected">Rejected</option>
              </select>
            </div>

            {/* Question Type Filter */}
            <div>
              <select
                value={candidateTypeFilter}
                onChange={(e) => setCandidateTypeFilter(e.target.value)}
                className="w-full bg-white dark:bg-[#12161F] border border-[#D9DEE7] dark:border-[#2D3545] text-xs rounded-lg px-3 py-2 dark:text-white focus:border-[#3156D3] focus:outline-none"
              >
                <option value="all">All Question Types</option>
                <option value="multiple_choice">Multiple Choice</option>
                <option value="true_false">True / False</option>
                <option value="fill_blank">Fill in Blank</option>
                <option value="matching">Matching</option>
                <option value="short_answer">Short Answer</option>
              </select>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-gray-100 text-xs">
            {/* Secondary Filters */}
            <div className="flex flex-wrap items-center gap-2">
              <select
                value={candidateDifficultyFilter}
                onChange={(e) => setCandidateDifficultyFilter(e.target.value)}
                className="bg-white dark:bg-[#12161F] border border-[#D9DEE7] dark:border-[#2D3545] text-xs rounded-lg px-2.5 py-1.5 dark:text-white focus:border-[#3156D3] focus:outline-none"
              >
                <option value="all">All Difficulties</option>
                <option value="easy">Easy</option>
                <option value="medium">Medium</option>
                <option value="hard">Hard</option>
              </select>

              <select
                value={candidateLessonScope}
                onChange={(e) => setCandidateLessonScope(e.target.value as any)}
                className="bg-white dark:bg-[#12161F] border border-[#D9DEE7] dark:border-[#2D3545] text-xs rounded-lg px-2.5 py-1.5 dark:text-white focus:border-[#3156D3] focus:outline-none"
              >
                <option value="all">All Course Lessons</option>
                <option value="current_lesson">Current Selected Lesson Only</option>
              </select>
            </div>

            {/* Sorting Controls */}
            <div className="flex items-center gap-2">
              <span className="text-[#737D8C] dark:text-gray-400 text-[11px] font-semibold">Sort by:</span>
              <select
                value={sortField}
                onChange={(e) => setSortField(e.target.value as any)}
                className="bg-white dark:bg-[#12161F] border border-[#D9DEE7] dark:border-[#2D3545] text-xs rounded-lg px-2.5 py-1.5 dark:text-white focus:border-[#3156D3] focus:outline-none"
              >
                <option value="date">Date Created</option>
                <option value="difficulty">Difficulty</option>
                <option value="points">Points</option>
                <option value="type">Question Type</option>
              </select>

              <button
                type="button"
                onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                className="p-1.5 rounded-lg border border-[#D9DEE7] dark:border-[#2D3545] hover:bg-gray-50 dark:bg-[#1C212B] text-[#1F2937] dark:text-white flex items-center gap-1 cursor-pointer transition-colors"
                title={`Sort ${sortOrder === 'asc' ? 'Ascending' : 'Descending'} (click to invert)`}
              >
                {sortOrder === 'asc' ? (
                  <ArrowUp className="w-3.5 h-3.5 text-[#3156D3]" />
                ) : (
                  <ArrowDown className="w-3.5 h-3.5 text-[#3156D3]" />
                )}
                <span className="text-[11px] font-medium uppercase">{sortOrder}</span>
              </button>

              {(candidateSearchQuery || candidateStatusFilter !== 'all' || candidateTypeFilter !== 'all' || candidateDifficultyFilter !== 'all' || candidateLessonScope !== 'all') && (
                <button
                  type="button"
                  onClick={() => {
                    setCandidateSearchQuery('');
                    setCandidateStatusFilter('all');
                    setCandidateTypeFilter('all');
                    setCandidateDifficultyFilter('all');
                    setCandidateLessonScope('all');
                  }}
                  className="text-xs text-[#3156D3] hover:underline cursor-pointer ml-1"
                >
                  Reset filters
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Candidates List */}
        {filteredAndSortedCandidates.length === 0 ? (
          <div className="bg-white dark:bg-[#181C24] rounded-xl border border-[#D9DEE7] dark:border-[#2D3545] p-8 text-center text-xs text-[#5B6472] dark:text-gray-400">
            <CheckCircle2 className="w-8 h-8 text-[#18794E] mx-auto mb-2" />
            <p className="text-sm font-semibold text-[#1F2937] dark:text-white">
              No questions match the current filters
            </p>
            <p className="mt-1 max-w-md mx-auto">
              Try adjusting your search query, difficulty, or status filter, or use the generation
              form above to request new candidate questions.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredAndSortedCandidates.map((cand, idx) => {
              const courseObj = courses.find((c) => c.id === cand.courseId);
              const topicObj = topics.find((t) => t.id === cand.topicId);
              const lessonObj = lessons.find((l) => l.id === cand.lessonId);

              return (
                <div
                  key={cand.id}
                  className={`bg-white dark:bg-[#181C24] rounded-xl border p-5 shadow-2xs space-y-4 transition-all ${
                    cand.status === 'rejected'
                      ? 'border-red-200 bg-red-50/20'
                      : cand.status === 'approved'
                      ? 'border-emerald-200 bg-emerald-50/20'
                      : 'border-[#D9DEE7] hover:border-[#3156D3]'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-bold text-[#737D8C] dark:text-gray-400 bg-gray-100 px-2 py-0.5 rounded">
                        Candidate #{idx + 1}
                      </span>
                      <span className="text-xs font-semibold text-[#3156D3] dark:text-indigo-300 bg-[#E8EEFF] dark:bg-indigo-950/40 px-2 py-0.5 rounded">
                        {cand.type.replace('_', ' ')}
                      </span>
                      <span className="text-xs font-medium text-gray-600 bg-gray-50 dark:bg-[#1C212B] border px-2 py-0.5 rounded">
                        {cand.difficulty} • {cand.points || 1} pt{cand.points !== 1 ? 's' : ''}
                      </span>
                      <span className="text-xs text-[#737D8C] dark:text-gray-400">
                        {topicObj?.title} {lessonObj?.title ? `→ ${lessonObj.title}` : ''} • {courseObj?.title}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <StatusBadge status={cand.status} />
                      <button
                        type="button"
                        onClick={() => handleRemoveCandidate(cand.id)}
                        className="p-1 rounded-md text-[#737D8C] dark:text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
                        title="Remove candidate question"
                        aria-label={`Remove candidate question ${idx + 1}`}
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Question Prompt */}
                  <div>
                    <h3 className="text-sm font-bold text-[#1F2937] dark:text-white leading-relaxed">
                      {cand.prompt}
                    </h3>
                  </div>

                  {/* Answer Preview */}
                  {cand.type === 'multiple_choice' && (
                    <div className="space-y-1.5 pl-2 border-l-2 border-gray-200 dark:border-gray-800">
                      {(cand.options || []).map((opt, i) => (
                        <div
                          key={opt.id}
                          className={`text-xs p-2 rounded flex items-center justify-between ${
                            opt.isCorrect
                              ? 'bg-[#EAF7F0] text-[#18794E] font-medium border border-[#18794E]/30'
                              : 'text-[#5B6472] dark:text-gray-400 bg-gray-50 dark:bg-[#1C212B]'
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
                    <div className="text-xs p-2.5 rounded bg-gray-50 dark:bg-[#1C212B] border border-gray-200 dark:border-gray-800 font-semibold text-[#1F2937] dark:text-white">
                      Expected Answer: {cand.correctBool ? 'True' : 'False'}
                    </div>
                  )}

                  {cand.type === 'fill_blank' && (
                    <div className="text-xs p-2.5 rounded bg-gray-50 dark:bg-[#1C212B] border border-gray-200 dark:border-gray-800">
                      <span className="text-[#5B6472] dark:text-gray-400">Accepted Answers: </span>
                      <span className="font-mono font-bold text-[#18794E]">
                        {(cand.acceptedAnswers || []).join(', ')}
                      </span>
                    </div>
                  )}

                  {cand.type === 'matching' && (
                    <div className="text-xs border rounded-lg divide-y bg-gray-50 dark:bg-[#1C212B]">
                      {(cand.matchingPairs || []).map((pair) => (
                        <div key={pair.id} className="p-2 grid grid-cols-1 sm:grid-cols-2 gap-2">
                          <span className="font-semibold">{pair.left}</span>
                          <span className="text-[#5B6472] dark:text-gray-400">{pair.right}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {cand.type === 'short_answer' && (
                    <div className="text-xs p-2.5 rounded bg-gray-50 dark:bg-[#1C212B] border border-gray-200 dark:border-gray-800">
                      <span className="font-semibold block text-[#1F2937] dark:text-white mb-0.5">
                        Grading Rubric / Key Concepts:
                      </span>
                      <span className="text-[#5B6472] dark:text-gray-400">{cand.expectedRubric}</span>
                    </div>
                  )}

                  {/* Pedagogical Explanation and Source Context */}
                  {cand.explanation && (
                    <div className="p-3 rounded-lg bg-[#EFF8FF] border border-[#175CD3]/20 text-xs">
                      <span className="font-bold text-[#175CD3] block mb-0.5">
                        Pedagogical Rationale:
                      </span>
                      <p className="text-[#1F2937] dark:text-white leading-relaxed">{cand.explanation}</p>
                    </div>
                  )}

                  {cand.rejectionReason && (
                    <div className="p-2.5 rounded-lg bg-red-50 border border-red-200 text-xs text-red-800">
                      <strong>Rejection reason:</strong> {cand.rejectionReason}
                    </div>
                  )}

                  {/* Actions: Edit, Remove, Approve, Reject */}
                  <div className="pt-3 border-t border-gray-100 flex items-center justify-between">
                    <span className="text-[11px] text-[#737D8C] dark:text-gray-400 italic">
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
                            courseId: selectedCourseId,
                            topicId: selectedTopicId,
                            lessonId: selectedLessonId,
                          })
                        }
                      >
                        Edit candidate
                      </Button>

                      <Button
                        variant="ghost"
                        size="sm"
                        leftIcon={<X className="w-3.5 h-3.5 text-gray-500 hover:text-red-600" />}
                        onClick={() => handleRemoveCandidate(cand.id)}
                        title="Remove question from page"
                      >
                        Remove
                      </Button>

                      {cand.status === 'pending_review' && (
                        <>
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
                        </>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Individual Reject Modal */}
      {rejectModalId && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/45 backdrop-blur-xs"
          role="dialog"
          aria-modal="true"
        >
          <div className="bg-white dark:bg-[#181C24] rounded-2xl max-w-md w-full p-6 shadow-xl border border-[#D9DEE7] dark:border-[#2D3545]">
            <h3 className="text-base font-bold text-[#1F2937] dark:text-white mb-1">Reject candidate question?</h3>
            <p className="text-xs text-[#5B6472] dark:text-gray-400 mb-4">
              This candidate will be flagged as rejected and discarded from the active question bank.
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
                placeholder="e.g. Inaccurate premise or outside lesson scope..."
                className="w-full bg-white dark:bg-[#12161F] border border-[#D9DEE7] dark:border-[#2D3545] text-xs rounded-lg px-3 py-2 dark:text-white focus:border-[#3156D3] focus:outline-none"
              />
            </FormField>

            <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-[#D9DEE7] dark:border-[#2D3545] mt-4">
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

      {/* Bulk Reject Modal */}
      {bulkRejectModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/45 backdrop-blur-xs"
          role="dialog"
          aria-modal="true"
        >
          <div className="bg-white dark:bg-[#181C24] rounded-2xl max-w-md w-full p-6 shadow-xl border border-[#D9DEE7] dark:border-[#2D3545]">
            <div className="flex items-center gap-2.5 mb-2 text-red-600">
              <XCircle className="w-5 h-5" />
              <h3 className="text-base font-bold text-[#1F2937] dark:text-white">Reject All Pending Candidates?</h3>
            </div>
            <p className="text-xs text-[#5B6472] dark:text-gray-400 mb-4">
              You are about to reject all <strong>{coursePendingCandidates.length}</strong> pending questions for this course. None of them will be promoted to the Question Bank.
            </p>

            <FormField
              id="bulk-reject-reason"
              label="Reason for bulk rejection (Optional)"
              helperText="Feedback for audit logging and candidate refinement."
            >
              <textarea
                id="bulk-reject-reason"
                rows={3}
                value={bulkRejectReason}
                onChange={(e) => setBulkRejectReason(e.target.value)}
                placeholder="e.g. Questions do not match the current lesson syllabus or requirements..."
                className="w-full bg-white dark:bg-[#12161F] border border-[#D9DEE7] dark:border-[#2D3545] text-xs rounded-lg px-3 py-2 dark:text-white focus:border-[#3156D3] focus:outline-none"
              />
            </FormField>

            <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-[#D9DEE7] dark:border-[#2D3545] mt-4">
              <Button variant="secondary" onClick={() => setBulkRejectModalOpen(false)}>
                Cancel
              </Button>
              <Button variant="danger" onClick={handleBulkRejectConfirm}>
                Reject All Pending Questions
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
