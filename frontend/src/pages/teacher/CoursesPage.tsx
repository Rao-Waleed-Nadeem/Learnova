import React, { useState, useMemo } from 'react';
import { BookOpen, Plus, ExternalLink, Edit3, Trash2, CheckCircle2, Archive, Layers } from 'lucide-react';
import { PageHeader } from '../../components/ui/PageHeader';
import { Button } from '../../components/ui/Button';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { SearchFilterBar, ActiveChip, FilterOption } from '../../components/ui/SearchFilterBar';
import { EmptyState } from '../../components/ui/EmptyState';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { FormField } from '../../components/ui/FormField';
import { Course, Topic, Lesson, CourseStatus } from '../../types';

interface CoursesPageProps {
  courses: Course[];
  topics: Topic[];
  lessons: Lesson[];
  onNavigate: (page: string, params?: Record<string, string>) => void;
  onSaveCourse: (course: Course) => void;
  onDeleteCourse: (id: string) => void;
}

export const CoursesPage: React.FC<CoursesPageProps> = ({
  courses,
  topics,
  lessons,
  onNavigate,
  onSaveCourse,
  onDeleteCourse,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingCourse, setEditingCourse] = useState<Course | null>(null);

  // Form states
  const [formTitle, setFormTitle] = useState('');
  const [formDesc, setFormDesc] = useState('');
  const [formStatus, setFormStatus] = useState<CourseStatus>('draft');
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  // Confirmation dialogs
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [confirmPublishCourse, setConfirmPublishCourse] = useState<Course | null>(null);

  // Filtered courses
  const filteredCourses = useMemo(() => {
    return courses.filter((c) => {
      const matchesSearch =
        c.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.description.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus = !statusFilter || c.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [courses, searchQuery, statusFilter]);

  const openCreateModal = () => {
    setEditingCourse(null);
    setFormTitle('');
    setFormDesc('');
    setFormStatus('draft');
    setFormErrors({});
    setModalOpen(true);
  };

  const openEditModal = (c: Course) => {
    setEditingCourse(c);
    setFormTitle(c.title);
    setFormDesc(c.description);
    setFormStatus(c.status);
    setFormErrors({});
    setModalOpen(true);
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const errors: Record<string, string> = {};
    if (!formTitle.trim()) {
      errors.title = 'Course title is required.';
    } else if (formTitle.trim().length < 3) {
      errors.title = 'Title must be at least 3 characters long.';
    }

    if (!formDesc.trim()) {
      errors.description = 'Course description is required.';
    }

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }

    const courseToSave: Course = {
      id: editingCourse ? editingCourse.id : `course-${Date.now()}`,
      title: formTitle.trim(),
      description: formDesc.trim(),
      status: formStatus,
      updatedAt: new Date().toISOString(),
      createdAt: editingCourse ? editingCourse.createdAt : new Date().toISOString(),
    };

    onSaveCourse(courseToSave);
    setModalOpen(false);
  };

  const handlePublishConfirmed = () => {
    if (confirmPublishCourse) {
      onSaveCourse({
        ...confirmPublishCourse,
        status: 'published',
        updatedAt: new Date().toISOString(),
      });
      setConfirmPublishCourse(null);
    }
  };

  const handleDeleteConfirmed = () => {
    if (confirmDeleteId) {
      const courseToDelete = courses.find((c) => c.id === confirmDeleteId);
      if (courseToDelete && courseToDelete.status !== 'archived') {
        alert(`Course "${courseToDelete.title}" must be archived before it can be deleted. Please set its status to Archived first.`);
        setConfirmDeleteId(null);
        return;
      }
      onDeleteCourse(confirmDeleteId);
      setConfirmDeleteId(null);
    }
  };

  const activeChips: ActiveChip[] = [];
  if (statusFilter) {
    activeChips.push({
      id: 'status',
      label: `Status: ${statusFilter}`,
      onRemove: () => setStatusFilter(''),
    });
  }

  const filters: FilterOption[] = [
    {
      id: 'status',
      label: 'Status',
      value: statusFilter,
      onChange: setStatusFilter,
      options: [
        { value: 'published', label: 'Published' },
        { value: 'draft', label: 'Draft' },
        { value: 'archived', label: 'Archived' },
      ],
    },
  ];

  return (
    <div className="space-y-6 view-enter-animation">
      <PageHeader
        title="Courses"
        description="Manage the courses available to you."
        primaryAction={
          <Button
            variant="primary"
            leftIcon={<Plus className="w-4 h-4" />}
            onClick={openCreateModal}
          >
            Create course
          </Button>
        }
      />

      <SearchFilterBar
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        searchPlaceholder="Search courses by title or description..."
        filters={filters}
        activeChips={activeChips}
        onClearAll={() => {
          setSearchQuery('');
          setStatusFilter('');
        }}
      />

      {filteredCourses.length === 0 ? (
        courses.length === 0 ? (
          <EmptyState
            icon={<BookOpen className="w-6 h-6" />}
            title="No courses yet"
            description="You currently have no courses assigned or created. Start by creating a course."
            actionLabel="Create course"
            onAction={openCreateModal}
          />
        ) : (
          <EmptyState
            icon={<BookOpen className="w-6 h-6" />}
            title="No courses match your search"
            description="Try adjusting your query or resetting the active status filters."
            actionLabel="Clear filters"
            onAction={() => {
              setSearchQuery('');
              setStatusFilter('');
            }}
          />
        )
      ) : (
        <div className="bg-white/90 dark:bg-[#181C24]/90 backdrop-blur-xs rounded-2xl border border-gray-200/80 dark:border-gray-800/80 overflow-hidden shadow-xs">
          {/* Desktop Table View */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50/70 dark:bg-[#12161F] border-b border-gray-200 dark:border-gray-800 text-xs font-semibold text-gray-500 dark:text-gray-400">
                  <th scope="col" className="py-3.5 px-5">Course Title & Overview</th>
                  <th scope="col" className="py-3.5 px-4 text-center">Curriculum Structure</th>
                  <th scope="col" className="py-3.5 px-4">Status</th>
                  <th scope="col" className="py-3.5 px-4">Last Updated</th>
                  <th scope="col" className="py-3.5 px-5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800 text-sm">
                {filteredCourses.map((c) => {
                  const courseTopics = topics.filter((t) => t.courseId === c.id);
                  const courseLessons = lessons.filter((l) => l.courseId === c.id);

                  return (
                    <tr key={c.id} className="hover:bg-gray-50/60 dark:hover:bg-gray-800/25 transition-colors group">
                      <td className="py-4 px-5 max-w-md">
                        <button
                          onClick={() => onNavigate('course_overview', { courseId: c.id })}
                          className="font-semibold text-gray-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 text-left transition-colors cursor-pointer text-sm"
                        >
                          {c.title}
                        </button>
                        <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2 mt-0.5 leading-relaxed">
                          {c.description}
                        </p>
                      </td>
                      <td className="py-4 px-4 text-center">
                        <div className="inline-flex items-center gap-2 text-xs font-medium text-gray-800 dark:text-gray-200 bg-gray-50 dark:bg-gray-800/80 border border-gray-200 dark:border-gray-700 px-2.5 py-1 rounded-md">
                          <Layers className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                          <span>{courseTopics.length} topics</span>
                          <span className="text-gray-300 dark:text-gray-600">•</span>
                          <span>{courseLessons.length} lessons</span>
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        <StatusBadge status={c.status} />
                      </td>
                      <td className="py-4 px-4 text-xs text-gray-500 dark:text-gray-400">
                        {new Date(c.updatedAt).toLocaleDateString(undefined, {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                        })}
                      </td>
                      <td className="py-4 px-5 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => onNavigate('curriculum', { courseId: c.id })}
                          >
                            Curriculum
                          </Button>
                          <Button
                            variant="primary"
                            size="sm"
                            onClick={() => onNavigate('course_overview', { courseId: c.id })}
                          >
                            Open
                          </Button>
                          <button
                            onClick={() => openEditModal(c)}
                            className="p-1.5 text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-md cursor-pointer transition-colors"
                            aria-label={`Edit ${c.title}`}
                            title="Edit course details"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => setConfirmDeleteId(c.id)}
                            className="p-1.5 text-gray-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-md cursor-pointer transition-colors"
                            aria-label={`Delete ${c.title}`}
                            title={c.status === 'archived' ? 'Delete archived course' : 'Archive course first before deleting'}
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

          {/* Mobile Card View */}
          <div className="md:hidden divide-y divide-gray-100 dark:divide-gray-800">
            {filteredCourses.map((c) => {
              const courseTopics = topics.filter((t) => t.courseId === c.id);
              const courseLessons = lessons.filter((l) => l.courseId === c.id);

              return (
                <div key={c.id} className="p-4 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <button
                      onClick={() => onNavigate('course_overview', { courseId: c.id })}
                      className="font-bold text-sm text-gray-900 dark:text-white text-left hover:text-indigo-600 dark:hover:text-indigo-400"
                    >
                      {c.title}
                    </button>
                    <StatusBadge status={c.status} />
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2">{c.description}</p>
                  <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400 pt-1">
                    <span>{courseTopics.length} topics • {courseLessons.length} lessons</span>
                    <span>Updated {new Date(c.updatedAt).toLocaleDateString()}</span>
                  </div>
                  <div className="flex items-center gap-2 pt-2">
                    <Button
                      variant="secondary"
                      size="sm"
                      className="flex-1"
                      onClick={() => onNavigate('curriculum', { courseId: c.id })}
                    >
                      Curriculum
                    </Button>
                    <Button
                      variant="primary"
                      size="sm"
                      className="flex-1"
                      onClick={() => onNavigate('course_overview', { courseId: c.id })}
                    >
                      Open
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Create / Edit Course Modal */}
      {modalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/10 dark:bg-slate-900/20 backdrop-blur-xs"
          role="dialog"
          aria-modal="true"
        >
          <div className="bg-white dark:bg-[#181C24] rounded-2xl max-w-lg w-full p-6 shadow-xl border border-[#D9DEE7] dark:border-[#2D3545]">
            <h2 className="text-lg font-bold text-[#1F2937] dark:text-white mb-1">
              {editingCourse ? 'Edit course details' : 'Create new course'}
            </h2>
            <p className="text-xs text-[#5B6472] dark:text-gray-400 mb-5">
              Enter academic course title and descriptive overview.
            </p>

            <form onSubmit={handleFormSubmit} className="space-y-4">
              <FormField
                id="course-title"
                label="Course title"
                required
                error={formErrors.title}
                helperText="Use a descriptive, academic title (e.g., Data Structures and Algorithms)."
              >
                <input
                  id="course-title"
                  type="text"
                  value={formTitle}
                  onChange={(e) => {
                    setFormTitle(e.target.value);
                    if (formErrors.title) setFormErrors({ ...formErrors, title: '' });
                  }}
                  placeholder="e.g., Introduction to Computer Science"
                  className="w-full bg-white dark:bg-[#12161F] dark:text-white border border-[#D9DEE7] dark:border-[#2D3545] text-sm rounded-lg px-3.5 py-2.5 focus:border-[#3156D3] focus:outline-none"
                />
              </FormField>

              <FormField
                id="course-desc"
                label="Course description"
                required
                error={formErrors.description}
                helperText="Summarize syllabus objectives, key topics covered, and intended outcomes."
              >
                <textarea
                  id="course-desc"
                  rows={3}
                  value={formDesc}
                  onChange={(e) => {
                    setFormDesc(e.target.value);
                    if (formErrors.description) setFormErrors({ ...formErrors, description: '' });
                  }}
                  placeholder="Provide an overview of the curriculum..."
                  className="w-full bg-white dark:bg-[#12161F] dark:text-white border border-[#D9DEE7] dark:border-[#2D3545] text-sm rounded-lg px-3.5 py-2.5 focus:border-[#3156D3] focus:outline-none"
                />
              </FormField>

              <FormField
                id="course-status"
                label="Initial status"
                helperText="Draft courses are only visible to instructors; publish when curriculum is ready."
              >
                <select
                  id="course-status"
                  value={formStatus}
                  onChange={(e) => setFormStatus(e.target.value as CourseStatus)}
                  className="w-full bg-white dark:bg-[#12161F] dark:text-white border border-[#D9DEE7] dark:border-[#2D3545] text-sm rounded-lg px-3.5 py-2.5 focus:border-[#3156D3] focus:outline-none"
                >
                  <option value="draft">Draft (Work in progress)</option>
                  <option value="published">Published (Active course)</option>
                  <option value="archived">Archived</option>
                </select>
              </FormField>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#D9DEE7] dark:border-[#2D3545]">
                <Button variant="secondary" type="button" onClick={() => setModalOpen(false)}>
                  Cancel
                </Button>
                <Button variant="primary" type="submit">
                  {editingCourse ? 'Save changes' : 'Create course'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Confirmation Dialog for Publishing */}
      <ConfirmDialog
        isOpen={!!confirmPublishCourse}
        title="Publish course to learners?"
        targetObject={confirmPublishCourse?.title}
        consequence="Once published, enrolled students will be able to access published topics, resources, and scheduled assessments."
        confirmLabel="Publish course"
        onConfirm={handlePublishConfirmed}
        onCancel={() => setConfirmPublishCourse(null)}
      />

      {/* Confirmation Dialog for Deleting */}
      <ConfirmDialog
        isOpen={!!confirmDeleteId}
        title="Delete course?"
        targetObject={courses.find((c) => c.id === confirmDeleteId)?.title}
        consequence={
          courses.find((c) => c.id === confirmDeleteId)?.status === 'archived'
            ? 'This will permanently remove the course and its curriculum units. All students have already been unenrolled.'
            : 'Courses must be set to "Archived" status before they can be deleted to unenroll students safely.'
        }
        isDestructive
        confirmLabel={courses.find((c) => c.id === confirmDeleteId)?.status === 'archived' ? 'Delete Course' : 'Archive Course First'}
        onConfirm={handleDeleteConfirmed}
        onCancel={() => setConfirmDeleteId(null)}
      />
    </div>
  );
};
