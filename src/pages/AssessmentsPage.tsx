import React, { useState, useMemo } from 'react';
import {
  ClipboardCheck,
  Plus,
  Clock,
  Eye,
  Edit3,
  Trash2,
  UploadCloud,
  CheckCircle2,
  BarChart3,
  Calendar,
} from 'lucide-react';
import { PageHeader } from '../components/ui/PageHeader';
import { Button } from '../components/ui/Button';
import { StatusBadge } from '../components/ui/StatusBadge';
import { SearchFilterBar, ActiveChip, FilterOption } from '../components/ui/SearchFilterBar';
import { EmptyState } from '../components/ui/EmptyState';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { Assessment, Course, Topic, QuestionData } from '../types';

interface AssessmentsPageProps {
  assessments: Assessment[];
  courses: Course[];
  topics: Topic[];
  questions: QuestionData[];
  onNavigate: (page: string, params?: Record<string, string>) => void;
  onSaveAssessment: (a: Assessment) => void;
  onDeleteAssessment: (id: string) => void;
  onNotify: (type: 'success' | 'error' | 'info', msg: string) => void;
}

export const AssessmentsPage: React.FC<AssessmentsPageProps> = ({
  assessments,
  courses,
  topics,
  questions,
  onNavigate,
  onSaveAssessment,
  onDeleteAssessment,
  onNotify,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [courseFilter, setCourseFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const [confirmPublishAssessment, setConfirmPublishAssessment] = useState<Assessment | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const filteredAssessments = useMemo(() => {
    return assessments.filter((a) => {
      const matchesSearch =
        a.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        a.instructions.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCourse = !courseFilter || a.courseId === courseFilter;
      const matchesType = !typeFilter || a.type === typeFilter;
      const matchesStatus = !statusFilter || a.status === statusFilter;
      return matchesSearch && matchesCourse && matchesType && matchesStatus;
    });
  }, [assessments, searchQuery, courseFilter, typeFilter, statusFilter]);

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
      label: `Type: ${typeFilter}`,
      onRemove: () => setTypeFilter(''),
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
      label: 'Evaluation Type',
      value: typeFilter,
      onChange: setTypeFilter,
      options: [
        { value: 'diagnostic', label: 'Diagnostic' },
        { value: 'formative', label: 'Formative' },
        { value: 'summative', label: 'Summative' },
      ],
    },
    {
      id: 'status',
      label: 'Status',
      value: statusFilter,
      onChange: setStatusFilter,
      options: [
        { value: 'published', label: 'Published' },
        { value: 'draft', label: 'Draft' },
        { value: 'scheduled', label: 'Scheduled' },
        { value: 'completed', label: 'Completed' },
      ],
    },
  ];

  const handlePublishConfirmed = () => {
    if (confirmPublishAssessment) {
      if (confirmPublishAssessment.questionIds.length === 0) {
        onNotify('error', 'Cannot publish an assessment with zero questions.');
        setConfirmPublishAssessment(null);
        return;
      }
      onSaveAssessment({
        ...confirmPublishAssessment,
        status: 'published',
        updatedAt: new Date().toISOString(),
      });
      setConfirmPublishAssessment(null);
      onNotify('success', 'Assessment published to enrolled learners.');
    }
  };

  const handleDeleteConfirmed = () => {
    if (confirmDeleteId) {
      onDeleteAssessment(confirmDeleteId);
      setConfirmDeleteId(null);
      onNotify('info', 'Assessment deleted.');
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Assessments"
        description="Build, configure, preview, and publish course assessments from approved question bank items."
        primaryAction={
          <Button
            variant="primary"
            leftIcon={<Plus className="w-4 h-4" />}
            onClick={() => onNavigate('assessment_editor')}
          >
            Create assessment
          </Button>
        }
      />

      <SearchFilterBar
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        searchPlaceholder="Search assessments by title or instructions..."
        filters={filters}
        activeChips={activeChips}
        onClearAll={() => {
          setSearchQuery('');
          setCourseFilter('');
          setTypeFilter('');
          setStatusFilter('');
        }}
      />

      {filteredAssessments.length === 0 ? (
        assessments.length === 0 ? (
          <EmptyState
            icon={<ClipboardCheck className="w-6 h-6" />}
            title="No assessments created yet"
            description="Create diagnostic quizzes, formative practice tests, or summative evaluations for your courses."
            actionLabel="Create assessment"
            onAction={() => onNavigate('assessment_editor')}
          />
        ) : (
          <EmptyState
            icon={<ClipboardCheck className="w-6 h-6" />}
            title="No assessments match these filters"
            description="Adjust your search criteria or clear the filters above."
            actionLabel="Clear filters"
            onAction={() => {
              setSearchQuery('');
              setCourseFilter('');
              setTypeFilter('');
              setStatusFilter('');
            }}
          />
        )
      ) : (
        <div className="bg-white rounded-xl border border-[#D9DEE7] overflow-hidden shadow-2xs">
          {/* Desktop Table View */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-[#F5F7FA] border-b border-[#D9DEE7] text-xs font-semibold text-[#5B6472]">
                  <th scope="col" className="py-3.5 px-5">Assessment Title</th>
                  <th scope="col" className="py-3.5 px-4">Course / Topic</th>
                  <th scope="col" className="py-3.5 px-3">Type</th>
                  <th scope="col" className="py-3.5 px-3 text-center">Questions</th>
                  <th scope="col" className="py-3.5 px-3">Time Limit</th>
                  <th scope="col" className="py-3.5 px-3">Status</th>
                  <th scope="col" className="py-3.5 px-5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#D9DEE7] text-sm">
                {filteredAssessments.map((a) => {
                  const courseObj = courses.find((c) => c.id === a.courseId);
                  const topicObj = topics.find((t) => t.id === a.topicId);

                  return (
                    <tr key={a.id} className="hover:bg-[#F5F7FA] transition-colors group">
                      <td className="py-4 px-5 max-w-sm">
                        <button
                          onClick={() => onNavigate('assessment_editor', { assessmentId: a.id })}
                          className="font-semibold text-[#1F2937] group-hover:text-[#3156D3] text-left transition-colors cursor-pointer text-sm"
                        >
                          {a.title}
                        </button>
                        <p className="text-xs text-[#5B6472] line-clamp-1 mt-0.5">
                          {a.instructions}
                        </p>
                      </td>
                      <td className="py-4 px-4 text-xs text-[#5B6472]">
                        <p className="font-semibold text-[#1F2937] truncate max-w-[150px]">
                          {courseObj?.title || 'Course'}
                        </p>
                        <p className="text-[11px] text-[#737D8C] truncate max-w-[150px]">
                          {topicObj?.title || 'General'}
                        </p>
                      </td>
                      <td className="py-4 px-3 text-xs">
                        <span className="capitalize font-medium text-[#1F2937] bg-gray-100 px-2.5 py-0.5 rounded border border-gray-200">
                          {a.type}
                        </span>
                      </td>
                      <td className="py-4 px-3 text-center text-xs font-semibold text-[#1F2937]">
                        {a.questionIds.length} items
                      </td>
                      <td className="py-4 px-3 text-xs text-[#5B6472]">
                        {a.timeLimitMinutes ? `${a.timeLimitMinutes} mins` : 'No limit'}
                      </td>
                      <td className="py-4 px-3">
                        <StatusBadge status={a.status} />
                      </td>
                      <td className="py-4 px-5 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {a.status === 'draft' && (
                            <Button
                              variant="outline"
                              size="sm"
                              leftIcon={<UploadCloud className="w-3.5 h-3.5" />}
                              onClick={() => setConfirmPublishAssessment(a)}
                            >
                              Publish
                            </Button>
                          )}
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => onNavigate('assessment_editor', { assessmentId: a.id })}
                          >
                            Edit
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            leftIcon={<BarChart3 className="w-3.5 h-3.5" />}
                            onClick={() => onNavigate('analytics', { courseId: a.courseId })}
                          >
                            Results
                          </Button>
                          <button
                            onClick={() => setConfirmDeleteId(a.id)}
                            className="p-1.5 text-[#5B6472] hover:text-[#B42318] hover:bg-[#FEF0EF] rounded cursor-pointer transition-colors"
                            title="Delete assessment"
                            aria-label={`Delete ${a.title}`}
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
            {filteredAssessments.map((a) => (
              <div key={a.id} className="p-4 space-y-2.5">
                <div className="flex items-start justify-between gap-2">
                  <span className="text-xs uppercase font-semibold text-[#3156D3] bg-[#E8EEFF] px-2 py-0.5 rounded">
                    {a.type}
                  </span>
                  <StatusBadge status={a.status} />
                </div>
                <h3
                  onClick={() => onNavigate('assessment_editor', { assessmentId: a.id })}
                  className="font-bold text-sm text-[#1F2937] cursor-pointer hover:text-[#3156D3]"
                >
                  {a.title}
                </h3>
                <div className="flex items-center justify-between text-xs text-[#737D8C]">
                  <span>{a.questionIds.length} questions</span>
                  <span>{a.timeLimitMinutes ? `${a.timeLimitMinutes} min limit` : 'Untimed'}</span>
                </div>
                <div className="flex items-center gap-2 pt-2">
                  <Button
                    variant="secondary"
                    size="sm"
                    className="flex-1"
                    onClick={() => onNavigate('assessment_editor', { assessmentId: a.id })}
                  >
                    Edit
                  </Button>
                  {a.status === 'draft' && (
                    <Button
                      variant="primary"
                      size="sm"
                      className="flex-1"
                      onClick={() => setConfirmPublishAssessment(a)}
                    >
                      Publish
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Confirmation Dialog for Publishing Assessment */}
      <ConfirmDialog
        isOpen={!!confirmPublishAssessment}
        title="Publish assessment to learners?"
        targetObject={confirmPublishAssessment?.title}
        consequence={`Once published, enrolled students will be able to attempt this ${confirmPublishAssessment?.type} assessment according to its time limit (${confirmPublishAssessment?.timeLimitMinutes || 'Untimed'} mins) and attempt constraints.`}
        confirmLabel="Publish assessment"
        onConfirm={handlePublishConfirmed}
        onCancel={() => setConfirmPublishAssessment(null)}
      />

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={!!confirmDeleteId}
        title="Delete assessment?"
        consequence="This will remove the test configuration. Any historical attempt scores are preserved in student gradebooks."
        isDestructive
        confirmLabel="Delete assessment"
        onConfirm={handleDeleteConfirmed}
        onCancel={() => setConfirmDeleteId(null)}
      />
    </div>
  );
};
