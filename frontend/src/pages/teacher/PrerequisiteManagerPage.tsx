import React, { useState } from 'react';
import {
  GitBranch,
  ArrowRight,
  Search,
  Check,
  X,
  AlertTriangle,
  CheckCircle2,
  Save,
  ArrowLeft,
  Info,
} from 'lucide-react';
import { PageHeader } from '../../components/ui/PageHeader';
import { Button } from '../../components/ui/Button';
import { Course, Topic } from '../../types';
import { validateAllPrerequisites, validatePrerequisiteAddition } from '../../utils/dag';

interface PrerequisiteManagerPageProps {
  course: Course;
  currentTopic: Topic;
  allTopics: Topic[];
  onNavigate: (page: string, params?: Record<string, string>) => void;
  onSavePrerequisites: (topicId: string, prereqIds: string[]) => void;
  onNotify: (type: 'success' | 'error' | 'info', msg: string) => void;
}

export const PrerequisiteManagerPage: React.FC<PrerequisiteManagerPageProps> = ({
  course,
  currentTopic,
  allTopics,
  onNavigate,
  onSavePrerequisites,
  onNotify,
}) => {
  const [selectedPrereqIds, setSelectedPrereqIds] = useState<string[]>(
    currentTopic.prerequisiteTopicIds || []
  );
  const [searchQuery, setSearchQuery] = useState('');
  const [validationError, setValidationError] = useState<string | null>(null);

  // Eligible topics = topics in this course excluding the topic itself
  const eligibleTopics = allTopics.filter(
    (t) =>
      t.courseId === course.id &&
      t.id !== currentTopic.id &&
      t.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Build existing graph
  const existingGraph: Record<string, string[]> = {};
  const topicNames: Record<string, string> = {};
  allTopics.forEach((t) => {
    existingGraph[t.id] = t.prerequisiteTopicIds || [];
    topicNames[t.id] = t.title;
  });

  const handleTogglePrerequisite = (candidateTopicId: string) => {
    setValidationError(null);

    if (selectedPrereqIds.includes(candidateTopicId)) {
      // Deselecting is always safe
      setSelectedPrereqIds(selectedPrereqIds.filter((id) => id !== candidateTopicId));
      return;
    }

    // Test addition using DAG cycle validation
    const testAddition = validatePrerequisiteAddition(
      existingGraph,
      currentTopic.id,
      candidateTopicId,
      topicNames
    );

    if (!testAddition.valid) {
      setValidationError(testAddition.error || 'Circular prerequisite detected.');
      return;
    }

    // Also test the entire candidate set
    const candidateSet = [...selectedPrereqIds, candidateTopicId];
    const testAll = validateAllPrerequisites(
      existingGraph,
      currentTopic.id,
      candidateSet,
      topicNames
    );

    if (!testAll.valid) {
      setValidationError(testAll.error || 'Circular prerequisite detected.');
      return;
    }

    setSelectedPrereqIds(candidateSet);
  };

  const handleRemoveChip = (prereqId: string) => {
    setValidationError(null);
    setSelectedPrereqIds(selectedPrereqIds.filter((id) => id !== prereqId));
  };

  const handleSave = () => {
    // Final verification before persisting
    const result = validateAllPrerequisites(
      existingGraph,
      currentTopic.id,
      selectedPrereqIds,
      topicNames
    );

    if (!result.valid) {
      setValidationError(result.error || 'Invalid dependency configuration.');
      onNotify('error', result.error || 'Could not save prerequisites.');
      return;
    }

    onSavePrerequisites(currentTopic.id, selectedPrereqIds);
    onNotify('success', 'Prerequisites successfully updated.');
    onNavigate('curriculum', { courseId: course.id });
  };

  return (
    <div className="space-y-6">
      <PageHeader
        breadcrumbs={[
          { label: 'Courses', onClick: () => onNavigate('courses') },
          { label: course.title, onClick: () => onNavigate('course_overview', { courseId: course.id }) },
          { label: 'Curriculum', onClick: () => onNavigate('curriculum', { courseId: course.id }) },
          { label: 'Prerequisites', active: true },
        ]}
        title={`Prerequisites: ${currentTopic.title}`}
        description="Choose which topics must be mastered before this topic unlocks for learners. The engine mathematically prevents circular paths."
        courseBadge={course.title}
        primaryAction={
          <Button
            variant="primary"
            leftIcon={<Save className="w-4 h-4" />}
            onClick={handleSave}
          >
            Save prerequisites
          </Button>
        }
        secondaryActions={
          <Button
            variant="secondary"
            size="sm"
            leftIcon={<ArrowLeft className="w-4 h-4" />}
            onClick={() => onNavigate('curriculum', { courseId: course.id })}
          >
            Back to curriculum
          </Button>
        }
      />

      {/* Validation Error Banner */}
      {validationError && (
        <div className="p-4 rounded-xl bg-[#FEF0EF] border border-[#B42318]/30 flex items-start gap-3 text-xs text-[#B42318] animate-in fade-in duration-150">
          <AlertTriangle className="w-5 h-5 shrink-0" />
          <div className="flex-1">
            <p className="font-bold">Dependency Validation Error</p>
            <p className="mt-0.5 leading-relaxed">{validationError}</p>
          </div>
          <button
            onClick={() => setValidationError(null)}
            className="text-current opacity-70 hover:opacity-100 cursor-pointer"
            aria-label="Dismiss error"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Main 2-column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Eligible Topics List with Checkboxes (7 cols) */}
        <div className="lg:col-span-7 bg-white dark:bg-[#181C24] rounded-xl border border-[#D9DEE7] dark:border-[#2D3545] dark:border-[#2D3545] dark:border-[#2D3545] dark:border-[#2D3545] p-5 shadow-2xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-[#D9DEE7] dark:border-[#2D3545] dark:border-[#2D3545] dark:border-[#2D3545]">
            <div>
              <h2 className="text-sm font-bold text-[#1F2937] dark:text-white dark:text-white dark:text-white">Eligible Topics in Course</h2>
              <p className="text-xs text-[#5B6472] dark:text-gray-400 dark:text-gray-400 dark:text-gray-400">Select topics that form foundational requirements</p>
            </div>
            <span className="text-xs font-semibold text-[#5B6472] dark:text-gray-400 dark:text-gray-400 dark:text-gray-400 bg-gray-100 px-2.5 py-0.5 rounded-full">
              {eligibleTopics.length} available
            </span>
          </div>

          {/* Search box */}
          <div className="relative">
            <Search className="w-4 h-4 text-[#737D8C] dark:text-gray-400 dark:text-gray-400 dark:text-gray-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search eligible topics..."
              className="w-full bg-white dark:bg-[#12161F] dark:text-white border border-[#D9DEE7] dark:border-[#2D3545] text-xs rounded-lg pl-9 pr-4 py-2 focus:border-[#3156D3] focus:outline-none"
            />
          </div>

          {eligibleTopics.length === 0 ? (
            <div className="text-center py-8 text-[#5B6472] dark:text-gray-400 dark:text-gray-400 dark:text-gray-400 text-xs">
              {searchQuery ? 'No topics match your search query.' : 'No other topics in this course to select.'}
            </div>
          ) : (
            <div className="divide-y divide-gray-100 max-h-[500px] overflow-y-auto">
              {eligibleTopics.map((t) => {
                const isSelected = selectedPrereqIds.includes(t.id);

                return (
                  <div
                    key={t.id}
                    onClick={() => handleTogglePrerequisite(t.id)}
                    className={`py-3 px-3 rounded-lg flex items-start gap-3 my-1 transition-colors cursor-pointer select-none ${
                      isSelected
                        ? 'bg-[#E8EEFF] dark:bg-indigo-950/40 border border-[#3156D3]/30 dark:border-indigo-800/40'
                        : 'hover:bg-gray-50 dark:bg-[#1C212B] dark:bg-[#1C212B] dark:bg-[#1C212B] border border-transparent'
                    }`}
                  >
                    <div
                      className={`w-5 h-5 rounded flex items-center justify-center shrink-0 mt-0.5 border ${
                        isSelected
                          ? 'bg-[#3156D3] border-[#3156D3] text-white'
                          : 'border-gray-300 dark:border-gray-700 bg-white dark:bg-[#12161F]'
                      }`}
                    >
                      {isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-[#1F2937] dark:text-white dark:text-white dark:text-white">{t.title}</span>
                        <span className="text-[10px] text-[#737D8C] dark:text-gray-400 dark:text-gray-400 dark:text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded">
                          Order #{t.order}
                        </span>
                      </div>
                      <p className="text-[11px] text-[#5B6472] dark:text-gray-400 dark:text-gray-400 dark:text-gray-400 line-clamp-1 mt-0.5">
                        {t.description}
                      </p>
                      {t.prerequisiteTopicIds.length > 0 && (
                        <span className="text-[10px] text-[#3156D3] font-medium block mt-1">
                          Has {t.prerequisiteTopicIds.length} underlying prerequisite(s)
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right Column: Selected Prerequisites & Graph Summary (5 cols) */}
        <div className="lg:col-span-5 space-y-5">
          {/* Selected Prerequisites Panel */}
          <div className="bg-white dark:bg-[#181C24] rounded-xl border border-[#D9DEE7] dark:border-[#2D3545] dark:border-[#2D3545] dark:border-[#2D3545] dark:border-[#2D3545] p-5 shadow-2xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#D9DEE7] dark:border-[#2D3545] dark:border-[#2D3545] dark:border-[#2D3545]">
              <h2 className="text-sm font-bold text-[#1F2937] dark:text-white dark:text-white dark:text-white">Selected Prerequisites</h2>
              <span className="text-xs font-bold text-[#3156D3] dark:text-indigo-300 bg-[#E8EEFF] dark:bg-indigo-950/40 px-2.5 py-0.5 rounded-full">
                {selectedPrereqIds.length} chosen
              </span>
            </div>

            {selectedPrereqIds.length === 0 ? (
              <div className="p-4 rounded-lg bg-gray-50 dark:bg-[#1C212B] dark:bg-[#1C212B] dark:bg-[#1C212B] border border-gray-200 dark:border-gray-800 dark:border-gray-800 dark:border-gray-800 text-center text-xs text-[#5B6472] dark:text-gray-400 dark:text-gray-400 dark:text-gray-400">
                <Info className="w-5 h-5 text-[#3156D3] mx-auto mb-1.5" />
                <p className="font-semibold text-[#1F2937] dark:text-white dark:text-white dark:text-white">No prerequisites assigned</p>
                <p className="text-[11px] mt-0.5">
                  This topic will be accessible to learners without any prior course prerequisites.
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {selectedPrereqIds.map((id) => {
                  const topicObj = allTopics.find((t) => t.id === id);
                  return (
                    <div
                      key={id}
                      className="p-2.5 rounded-lg bg-[#F5F7FA] border border-[#D9DEE7] dark:border-[#2D3545] dark:border-[#2D3545] dark:border-[#2D3545] flex items-center justify-between gap-2 text-xs"
                    >
                      <div className="flex items-center gap-2 truncate">
                        <GitBranch className="w-3.5 h-3.5 text-[#3156D3] shrink-0" />
                        <span className="font-semibold text-[#1F2937] dark:text-white dark:text-white dark:text-white truncate">
                          {topicObj?.title || id}
                        </span>
                      </div>
                      <button
                        onClick={() => handleRemoveChip(id)}
                        className="p-1 text-[#737D8C] dark:text-gray-400 dark:text-gray-400 dark:text-gray-400 hover:text-[#B42318] hover:bg-white dark:hover:bg-[#1E232E] rounded cursor-pointer transition-colors"
                        aria-label={`Remove prerequisite ${topicObj?.title || id}`}
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Visual Dependency Flow Representation */}
          <div className="bg-white dark:bg-[#181C24] rounded-xl border border-[#D9DEE7] dark:border-[#2D3545] dark:border-[#2D3545] dark:border-[#2D3545] dark:border-[#2D3545] p-5 shadow-2xs space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#737D8C] dark:text-gray-400 dark:text-gray-400 dark:text-gray-400">
              Learning Path Dependency Flow
            </h3>

            <div className="p-4 rounded-lg bg-[#F5F7FA] border border-[#D9DEE7] dark:border-[#2D3545] dark:border-[#2D3545] dark:border-[#2D3545] space-y-3">
              {selectedPrereqIds.length === 0 ? (
                <div className="text-xs text-[#5B6472] dark:text-gray-400 dark:text-gray-400 dark:text-gray-400 flex items-center justify-center gap-2 py-2">
                  <span className="font-medium text-[#1F2937] dark:text-white dark:text-white dark:text-white">[Start of Course]</span>
                  <ArrowRight className="w-3.5 h-3.5 text-[#3156D3]" />
                  <span className="font-semibold text-[#2646B8]">{currentTopic.title}</span>
                </div>
              ) : (
                <div className="flex flex-col gap-2">
                  <div className="space-y-1">
                    <span className="text-[11px] font-semibold text-[#5B6472] dark:text-gray-400 dark:text-gray-400 dark:text-gray-400">Required Prerequisites:</span>
                    {selectedPrereqIds.map((id) => (
                      <div
                        key={id}
                        className="bg-white dark:bg-[#181C24] px-3 py-1.5 rounded border border-gray-200 dark:border-gray-800 text-xs font-medium text-[#1F2937] dark:text-white flex items-center justify-between"
                      >
                        <span>{topicNames[id] || id}</span>
                        <span className="text-[10px] text-[#18794E] font-semibold">Must complete</span>
                      </div>
                    ))}
                  </div>

                  <div className="flex justify-center py-1 text-[#3156D3]">
                    <ArrowRight className="w-4 h-4 rotate-90" />
                  </div>

                  <div className="bg-[#E8EEFF] border border-[#3156D3]/40 p-2.5 rounded-lg text-xs font-bold text-[#2646B8] flex items-center justify-center gap-1.5">
                    <span>Unlocks:</span>
                    <span>{currentTopic.title}</span>
                  </div>
                </div>
              )}
            </div>

            <p className="text-[11px] text-[#737D8C] dark:text-gray-400 dark:text-gray-400 dark:text-gray-400 leading-relaxed">
              Learners must meet the mastery threshold in each prerequisite topic before this unit
              becomes active on their learning path.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
