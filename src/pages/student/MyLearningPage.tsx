import React, { useState } from 'react';
import { Course, Topic, Lesson, Enrollment } from '../../types';
import { BookOpen, Play, Map, Compass, CheckCircle2, ArrowRight } from 'lucide-react';
import { StudentNavigationPage } from '../../components/student/StudentLayout';

interface MyLearningPageProps {
  courses: Course[];
  topics: Topic[];
  lessons: Lesson[];
  enrollments: Enrollment[];
  onNavigate: (page: StudentNavigationPage, params?: Record<string, string>) => void;
}

export const MyLearningPage: React.FC<MyLearningPageProps> = ({
  courses,
  topics,
  lessons,
  enrollments,
  onNavigate,
}) => {
  const [activeTab, setActiveTab] = useState<'active' | 'completed'>('active');

  const enrolledCourseIds = new Set(enrollments.map((e) => e.courseId));
  const enrolledCourses = courses.filter((c) => enrolledCourseIds.has(c.id));

  const displayedCourses = enrolledCourses.filter((c) => {
    const enr = enrollments.find((e) => e.courseId === c.id);
    if (activeTab === 'completed') return (enr?.progressPercent || 0) >= 100;
    return (enr?.progressPercent || 0) < 100;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 dark:text-white tracking-tight">
            My Learning
          </h1>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
            Track your ongoing courses, curriculum map progression, and milestone completion.
          </p>
        </div>

        {/* Tab Filter */}
        <div className="flex items-center gap-1.5 p-1 rounded-xl bg-gray-100 dark:bg-gray-800 text-xs font-semibold self-start sm:self-auto">
          <button
            type="button"
            onClick={() => setActiveTab('active')}
            className={`px-3 py-1.5 rounded-lg transition ${
              activeTab === 'active'
                ? 'bg-white dark:bg-[#181C24] text-indigo-600 dark:text-indigo-400 shadow-2xs'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900'
            }`}
          >
            In Progress ({enrolledCourses.filter((c) => (enrollments.find((e) => e.courseId === c.id)?.progressPercent || 0) < 100).length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('completed')}
            className={`px-3 py-1.5 rounded-lg transition ${
              activeTab === 'completed'
                ? 'bg-white dark:bg-[#181C24] text-indigo-600 dark:text-indigo-400 shadow-2xs'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900'
            }`}
          >
            Completed ({enrolledCourses.filter((c) => (enrollments.find((e) => e.courseId === c.id)?.progressPercent || 0) >= 100).length})
          </button>
        </div>
      </div>

      {/* Courses List */}
      {displayedCourses.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {displayedCourses.map((course) => {
            const courseTopics = topics.filter((t) => t.courseId === course.id);
            const enr = enrollments.find((e) => e.courseId === course.id);
            const progress = enr?.progressPercent || 0;

            return (
              <div
                key={course.id}
                className="p-6 rounded-2xl bg-white dark:bg-[#181C24] border border-[#D9DEE7] dark:border-[#2D3545] shadow-xs flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400 mb-2">
                    <span className="font-semibold text-indigo-600 dark:text-indigo-400">
                      {courseTopics.length} Curriculum Units
                    </span>
                    <span className="font-bold text-gray-800 dark:text-gray-200">{progress}% Complete</span>
                  </div>

                  <h3 className="text-lg font-bold text-gray-900 dark:text-white leading-snug">
                    {course.title}
                  </h3>

                  <p className="mt-2 text-xs sm:text-sm text-gray-600 dark:text-gray-400 line-clamp-2 leading-relaxed">
                    {course.description}
                  </p>

                  {/* Progress bar */}
                  <div className="mt-5">
                    <div className="w-full bg-gray-100 dark:bg-gray-800 rounded-full h-2 overflow-hidden">
                      <div
                        className="bg-indigo-600 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                  </div>
                </div>

                <div className="mt-6 pt-4 border-t border-gray-100 dark:border-gray-800 flex items-center justify-between gap-3">
                  <button
                    type="button"
                    onClick={() => onNavigate('course_map', { courseId: course.id })}
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-gray-700 dark:text-gray-300 hover:text-indigo-600 dark:hover:text-indigo-400"
                  >
                    <Map className="w-4 h-4" />
                    <span>View Map</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => onNavigate('course_map', { courseId: course.id })}
                    className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs flex items-center gap-1.5 transition shadow-2xs cursor-pointer"
                  >
                    <Play className="w-3.5 h-3.5 fill-current" />
                    <span>Continue Learning</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="p-12 text-center bg-white dark:bg-[#181C24] border border-[#D9DEE7] dark:border-[#2D3545] rounded-2xl space-y-4">
          <div className="w-12 h-12 mx-auto rounded-full bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 flex items-center justify-center">
            <BookOpen className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-base font-bold text-gray-900 dark:text-white">
              {activeTab === 'completed' ? 'No completed courses yet' : 'No active enrollments'}
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 max-w-sm mx-auto">
              {activeTab === 'completed'
                ? 'Keep progressing through your active course units to reach final summative completion.'
                : 'Browse our academic course catalog to self-enroll in a subject.'}
            </p>
          </div>
          <button
            type="button"
            onClick={() => onNavigate('catalog')}
            className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs transition cursor-pointer"
          >
            Explore Course Catalog
          </button>
        </div>
      )}
    </div>
  );
};
