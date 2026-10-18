import React, { useState } from 'react';
import { Course, Topic, Enrollment } from '../../types';
import { Search, BookOpen, CheckCircle, ArrowRight, X } from 'lucide-react';
import { StudentNavigationPage } from '../../components/student/StudentLayout';

interface CourseCatalogPageProps {
  courses: Course[];
  topics: Topic[];
  enrollments: Enrollment[];
  onNavigate: (page: StudentNavigationPage, params?: Record<string, string>) => void;
}

export const CourseCatalogPage: React.FC<CourseCatalogPageProps> = ({
  courses,
  topics,
  enrollments,
  onNavigate,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState<'all' | 'enrolled' | 'available'>('all');

  const enrolledCourseIds = new Set(enrollments.map((e) => e.courseId));
  const publishedCourses = courses.filter((c) => c.status === 'published');

  const filteredCourses = publishedCourses.filter((course) => {
    const isEnrolled = enrolledCourseIds.has(course.id);
    if (filter === 'enrolled' && !isEnrolled) return false;
    if (filter === 'available' && isEnrolled) return false;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchTitle = course.title.toLowerCase().includes(q);
      const matchDesc = course.description.toLowerCase().includes(q);
      return matchTitle || matchDesc;
    }
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 dark:text-white tracking-tight">
          Explore Course Catalog
        </h1>
        <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
          Discover verified university curricula with adaptive diagnostics and personalized learning paths.
        </p>
      </div>

      {/* Search and Filters Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        {/* Search Input */}
        <div className="relative flex-1 max-w-md">
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
            <Search className="w-4 h-4" />
          </div>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by course title or keyword..."
            className="block w-full pl-10 pr-9 py-2.5 text-sm rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-[#181C24] text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
              aria-label="Clear search query"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1.5 p-1 rounded-xl bg-gray-100 dark:bg-gray-800 text-xs font-semibold self-start sm:self-auto">
          <button
            type="button"
            onClick={() => setFilter('all')}
            className={`px-3 py-1.5 rounded-lg transition ${
              filter === 'all'
                ? 'bg-white dark:bg-[#181C24] text-indigo-600 dark:text-indigo-400 shadow-2xs'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900'
            }`}
          >
            All Courses ({publishedCourses.length})
          </button>
          <button
            type="button"
            onClick={() => setFilter('available')}
            className={`px-3 py-1.5 rounded-lg transition ${
              filter === 'available'
                ? 'bg-white dark:bg-[#181C24] text-indigo-600 dark:text-indigo-400 shadow-2xs'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900'
            }`}
          >
            Available to Join
          </button>
          <button
            type="button"
            onClick={() => setFilter('enrolled')}
            className={`px-3 py-1.5 rounded-lg transition ${
              filter === 'enrolled'
                ? 'bg-white dark:bg-[#181C24] text-indigo-600 dark:text-indigo-400 shadow-2xs'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900'
            }`}
          >
            My Enrolled ({enrolledCourseIds.size})
          </button>
        </div>
      </div>

      {/* Course Cards Grid */}
      {filteredCourses.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredCourses.map((course) => {
            const isEnrolled = enrolledCourseIds.has(course.id);
            const courseTopics = topics.filter((t) => t.courseId === course.id);
            const enr = enrollments.find((e) => e.courseId === course.id);

            return (
              <div
                key={course.id}
                className="bg-white dark:bg-[#181C24] border border-[#D9DEE7] dark:border-[#2D3545] rounded-2xl p-6 flex flex-col justify-between hover:border-indigo-300 dark:hover:border-indigo-700 transition shadow-xs group"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                      Computer Science
                    </span>

                    {isEnrolled ? (
                      <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700 dark:text-emerald-400 px-2.5 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800">
                        <CheckCircle className="w-3.5 h-3.5" />
                        <span>Enrolled</span>
                      </span>
                    ) : (
                      <span className="text-xs text-gray-500 dark:text-gray-400 font-medium">
                        Open for Self-Enrollment
                      </span>
                    )}
                  </div>

                  <h3 className="text-lg font-bold text-gray-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition leading-snug">
                    {course.title}
                  </h3>

                  <p className="mt-2 text-xs sm:text-sm text-gray-600 dark:text-gray-400 line-clamp-3 leading-relaxed">
                    {course.description}
                  </p>

                  <div className="mt-4 flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
                    <span className="flex items-center gap-1">
                      <BookOpen className="w-3.5 h-3.5" />
                      <span>{courseTopics.length} Topics</span>
                    </span>
                    {isEnrolled && (
                      <span className="font-semibold text-indigo-600 dark:text-indigo-400">
                        {enr?.progressPercent || 0}% Completed
                      </span>
                    )}
                  </div>
                </div>

                <div className="mt-6 pt-4 border-t border-gray-100 dark:border-gray-800 flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => onNavigate('course_details', { courseId: course.id })}
                    className="text-xs font-semibold text-gray-700 dark:text-gray-300 hover:text-indigo-600 dark:hover:text-indigo-400 cursor-pointer"
                  >
                    View Syllabus Details
                  </button>

                  {isEnrolled ? (
                    <button
                      type="button"
                      onClick={() => onNavigate('course_map', { courseId: course.id })}
                      className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs flex items-center gap-1.5 transition shadow-2xs cursor-pointer"
                    >
                      <span>Go to Course</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => onNavigate('course_details', { courseId: course.id })}
                      className="px-4 py-2 rounded-xl border border-indigo-600 text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/30 font-semibold text-xs flex items-center gap-1.5 transition cursor-pointer"
                    >
                      <span>Inspect & Enroll</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="p-12 text-center bg-white dark:bg-[#181C24] border border-[#D9DEE7] dark:border-[#2D3545] rounded-2xl space-y-3">
          <Search className="w-8 h-8 mx-auto text-gray-400" />
          <h3 className="text-base font-bold text-gray-900 dark:text-white">
            No courses match your query
          </h3>
          <p className="text-xs text-gray-500 dark:text-gray-400 max-w-sm mx-auto">
            Try adjusting your search terms or clear the filter to see all available university courses.
          </p>
          <button
            type="button"
            onClick={() => {
              setSearchQuery('');
              setFilter('all');
            }}
            className="px-4 py-2 rounded-xl border border-gray-300 dark:border-gray-700 text-xs font-semibold hover:bg-gray-50 dark:hover:bg-gray-800"
          >
            Clear Filters
          </button>
        </div>
      )}
    </div>
  );
};
