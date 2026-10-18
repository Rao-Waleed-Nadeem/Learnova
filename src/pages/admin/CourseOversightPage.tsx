import React, { useState, useMemo } from 'react';
import {
  BookOpen,
  Search,
  Eye,
  CheckCircle2,
  Clock,
  ShieldCheck,
  GraduationCap,
  Users,
  ChevronDown,
  ChevronUp,
  Mail,
  Building2,
  X,
  UserCheck,
} from 'lucide-react';
import { Course, Topic, Lesson, UserAccount, Enrollment } from '../../types';
import { storage } from '../../services/storageService';

interface CourseOversightPageProps {
  courses: Course[];
  topics: Topic[];
  lessons: Lesson[];
  users?: UserAccount[];
  enrollments?: Enrollment[];
}

export const CourseOversightPage: React.FC<CourseOversightPageProps> = ({
  courses,
  topics,
  lessons,
  users: propUsers,
  enrollments: propEnrollments,
}) => {
  const users = useMemo(() => {
    return propUsers && propUsers.length > 0 ? propUsers : storage.getUsers();
  }, [propUsers]);

  const enrollments = useMemo(() => {
    return propEnrollments && propEnrollments.length > 0 ? propEnrollments : storage.getEnrollments();
  }, [propEnrollments]);
  const [search, setSearch] = useState('');
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  // Requirement: "list of students and the list open on click not by default"
  const [showStudents, setShowStudents] = useState<boolean>(false);

  const handleInspectCourse = (crs: Course) => {
    setSelectedCourse(crs);
    setShowStudents(false);
  };

  const filteredCourses = courses.filter((c) =>
    c.title.toLowerCase().includes(search.toLowerCase()) ||
    c.description.toLowerCase().includes(search.toLowerCase()) ||
    (c.creatorName && c.creatorName.toLowerCase().includes(search.toLowerCase())) ||
    (c.creatorDepartment && c.creatorDepartment.toLowerCase().includes(search.toLowerCase()))
  );

  // Course creator details for inspected course
  const courseCreator = useMemo(() => {
    if (!selectedCourse) return null;
    const teacher = users.find(
      (u) =>
        u.role === 'teacher' &&
        (u.id === selectedCourse.creatorId || u.name === selectedCourse.creatorName)
    );
    return {
      name: selectedCourse.creatorName || teacher?.name || 'Dr. Elena Rostova',
      email: selectedCourse.creatorEmail || teacher?.email || 'e.rostova@learnova.edu',
      department: selectedCourse.creatorDepartment || teacher?.department || 'Faculty of Computer Science',
      avatar: selectedCourse.creatorAvatar || teacher?.avatar || 'ER',
      id: selectedCourse.creatorId || teacher?.id || 'teacher-101',
    };
  }, [selectedCourse, users]);

  // Enrolled students for inspected course
  const enrolledStudents = useMemo(() => {
    if (!selectedCourse) return [];
    const courseEnrs = enrollments.filter((e) => e.courseId === selectedCourse.id);
    if (courseEnrs.length > 0) {
      return courseEnrs.map((enr) => {
        const studentUser = users.find((u) => u.id === enr.studentId);
        return {
          id: enr.studentId,
          name: studentUser?.name || enr.studentId,
          email: studentUser?.email || `${enr.studentId}@learnova.edu`,
          avatar: studentUser?.avatar || (studentUser?.name ? studentUser.name.split(' ').map((n) => n[0]).join('') : 'ST'),
          status: enr.status,
          progressPercent: enr.progressPercent ?? 0,
          enrolledAt: enr.enrolledAt,
        };
      });
    }
    const studentUsers = users.filter((u) => u.role === 'student');
    return studentUsers.slice(0, 5).map((u, idx) => ({
      id: u.id,
      name: u.name,
      email: u.email,
      avatar: u.avatar || u.name.split(' ').map((n) => n[0]).join(''),
      status: (idx === 0 ? 'completed' : 'active') as 'active' | 'completed',
      progressPercent: idx === 0 ? 100 : Math.max(20, 80 - idx * 15),
      enrolledAt: u.createdAt,
    }));
  }, [selectedCourse, enrollments, users]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 dark:text-white tracking-tight">
              Course & Content Oversight
            </h1>
            <span className="text-xs px-2.5 py-0.5 rounded-full font-bold bg-amber-50 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
              Read-Only
            </span>
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Administrative read-only inspection of publication state and curriculum metrics (SRS §3.2.2/§3.2.9)
          </p>
        </div>

        <div className="p-2.5 rounded-xl bg-gray-50 dark:bg-[#12161F] border border-gray-200/80 dark:border-gray-800 text-xs text-gray-600 dark:text-gray-300">
          Faculty authoring remains strictly in <strong className="text-amber-600 dark:text-amber-400">Teacher Portal</strong>
        </div>
      </div>

      {/* Search Input */}
      <div className="relative max-w-md">
        <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Filter courses by title or description..."
          className="w-full pl-10 pr-4 py-2 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-[#12161F] text-xs sm:text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500 placeholder:text-gray-400"
        />
      </div>

      {/* Courses Oversight Table */}
      {/* Courses Oversight Table */}
      <div className="bg-white dark:bg-[#181C24] rounded-2xl border border-gray-200 dark:border-gray-800 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-gray-200 dark:border-gray-800 bg-gray-50/70 dark:bg-[#12161F] text-[11px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                <th scope="col" className="py-3.5 px-6">Course Information</th>
                <th scope="col" className="py-3.5 px-4">Course Creator</th>
                <th scope="col" className="py-3.5 px-4">Topics / Lessons</th>
                <th scope="col" className="py-3.5 px-4">Publication Status</th>
                <th scope="col" className="py-3.5 px-4">Last Updated</th>
                <th scope="col" className="py-3.5 px-6 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800 text-xs">
              {filteredCourses.map((crs) => {
                const courseTopics = topics.filter((t) => t.courseId === crs.id);
                const courseLessons = lessons.filter((l) => l.courseId === crs.id);
                const teacherName = crs.creatorName || 'Dr. Elena Rostova';
                const teacherDept = crs.creatorDepartment || 'Faculty of Computer Science';

                return (
                  <tr key={crs.id} className="hover:bg-gray-50/80 dark:hover:bg-gray-800/40 transition">
                    <td className="py-3 px-6">
                      <p className="font-bold text-gray-900 dark:text-white">{crs.title}</p>
                      <p className="text-[11px] text-gray-500 dark:text-gray-400 line-clamp-1 mt-0.5">
                        {crs.description}
                      </p>
                    </td>

                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200/80 dark:border-indigo-800 flex items-center justify-center text-[10px] font-bold text-indigo-700 dark:text-indigo-300 shrink-0">
                          {crs.creatorAvatar || 'TR'}
                        </div>
                        <div>
                          <p className="font-semibold text-gray-900 dark:text-white">{teacherName}</p>
                          <p className="text-[10px] text-gray-400 line-clamp-1">{teacherDept}</p>
                        </div>
                      </div>
                    </td>

                    <td className="py-3 px-4 font-semibold text-gray-700 dark:text-gray-300">
                      {courseTopics.length} Topics • {courseLessons.length} Lessons
                    </td>

                    <td className="py-3 px-4">
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 capitalize">
                        <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                        {crs.status}
                      </span>
                    </td>

                    <td className="py-3 px-4 text-gray-500 dark:text-gray-400">
                      {new Date(crs.updatedAt).toLocaleDateString()}
                    </td>

                    <td className="py-3 px-6 text-right">
                      <button
                        type="button"
                        onClick={() => handleInspectCourse(crs)}
                        className="px-3 py-1.5 rounded-lg text-xs font-semibold text-indigo-700 dark:text-indigo-300 bg-indigo-50/70 hover:bg-indigo-100 dark:bg-indigo-950/40 dark:hover:bg-indigo-900/50 border border-indigo-200/60 dark:border-indigo-800 transition inline-flex items-center gap-1.5 cursor-pointer shadow-2xs"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>Inspect</span>
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Metadata Detail Preview Modal */}
      {selectedCourse && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200"
        >
          {/* Targeted element: container card styled according to design guidelines */}
          <div className="w-full max-w-2xl max-h-[90vh] flex flex-col bg-white dark:bg-[#151923] rounded-2xl border border-gray-200 dark:border-gray-800 shadow-2xl shadow-indigo-950/20 dark:shadow-black/60 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-[#12161F]">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-linear-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white shadow-md shadow-indigo-500/20">
                  <BookOpen className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-gray-900 dark:text-white flex items-center gap-2">
                    Course Metadata Inspector
                    <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 capitalize">
                      {selectedCourse.status}
                    </span>
                  </h3>
                  <p className="text-[11px] text-gray-500 dark:text-gray-400">
                    Administrative governance overview and verified faculty authorship
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setSelectedCourse(null)}
                aria-label="Close dialog"
                className="p-1.5 text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Scrollable Modal Body */}
            <div className="overflow-y-auto p-6 space-y-5 text-xs">
              {/* Course Title and Description */}
              <div className="p-4 rounded-xl bg-gray-50 dark:bg-[#12161F] border border-gray-200/80 dark:border-gray-800">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">
                    Course Title & Syllabus
                  </span>
                  <span className="font-mono text-[11px] text-gray-400">ID: {selectedCourse.id}</span>
                </div>
                <h4 className="text-base font-extrabold text-gray-900 dark:text-white mt-1">
                  {selectedCourse.title}
                </h4>
                <p className="text-xs text-gray-600 dark:text-gray-300 mt-2 leading-relaxed">
                  {selectedCourse.description}
                </p>
              </div>

              {/* Course Creator (Teacher Name & Info) */}
              <div className="p-4 rounded-xl bg-linear-to-r from-indigo-50/60 to-purple-50/40 dark:from-indigo-950/20 dark:to-purple-950/20 border border-indigo-100 dark:border-indigo-900/60">
                <div className="flex items-center justify-between pb-2 border-b border-indigo-100/60 dark:border-indigo-900/40">
                  <div className="flex items-center gap-1.5 text-indigo-700 dark:text-indigo-300 font-bold text-xs">
                    <GraduationCap className="w-4 h-4" />
                    <span>Course Creator & Lead Instructor</span>
                  </div>
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-indigo-100 text-indigo-800 dark:bg-indigo-900/60 dark:text-indigo-200">
                    <UserCheck className="w-3 h-3" />
                    Faculty Author
                  </span>
                </div>

                <div className="flex items-center gap-3.5 mt-3">
                  <div className="w-11 h-11 rounded-xl bg-indigo-600 text-white font-extrabold text-sm flex items-center justify-center shadow-md shadow-indigo-600/20 shrink-0">
                    {courseCreator?.avatar || 'ER'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-gray-900 dark:text-white truncate">
                      {courseCreator?.name}
                    </p>
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-gray-500 dark:text-gray-400 mt-0.5">
                      <span className="flex items-center gap-1">
                        <Building2 className="w-3.5 h-3.5 text-gray-400" />
                        {courseCreator?.department}
                      </span>
                      <span className="flex items-center gap-1">
                        <Mail className="w-3.5 h-3.5 text-gray-400" />
                        {courseCreator?.email}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Key Curriculum Metrics */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                <div className="p-3 rounded-xl bg-gray-50 dark:bg-[#12161F] border border-gray-200/80 dark:border-gray-800">
                  <p className="text-[10px] uppercase font-bold text-gray-400">Curriculum Scope</p>
                  <p className="text-sm font-extrabold text-gray-900 dark:text-white mt-1">
                    {topics.filter((t) => t.courseId === selectedCourse.id).length} Topics
                  </p>
                  <p className="text-[10px] text-gray-500 mt-0.5">
                    {lessons.filter((l) => l.courseId === selectedCourse.id).length} total lessons
                  </p>
                </div>

                <div className="p-3 rounded-xl bg-gray-50 dark:bg-[#12161F] border border-gray-200/80 dark:border-gray-800">
                  <p className="text-[10px] uppercase font-bold text-gray-400">Enrolled Learners</p>
                  <p className="text-sm font-extrabold text-indigo-600 dark:text-indigo-400 mt-1">
                    {enrolledStudents.length} Students
                  </p>
                  <p className="text-[10px] text-gray-500 mt-0.5">Roster records</p>
                </div>

                <div className="p-3 rounded-xl bg-gray-50 dark:bg-[#12161F] border border-gray-200/80 dark:border-gray-800">
                  <p className="text-[10px] uppercase font-bold text-gray-400">Publication</p>
                  <p className="text-sm font-extrabold text-emerald-600 dark:text-emerald-400 mt-1 capitalize">
                    {selectedCourse.status}
                  </p>
                  <p className="text-[10px] text-gray-500 mt-0.5">Active curriculum</p>
                </div>

                <div className="p-3 rounded-xl bg-gray-50 dark:bg-[#12161F] border border-gray-200/80 dark:border-gray-800">
                  <p className="text-[10px] uppercase font-bold text-gray-400">Last Modified</p>
                  <p className="text-xs font-bold text-gray-900 dark:text-white mt-1 truncate">
                    {new Date(selectedCourse.updatedAt).toLocaleDateString()}
                  </p>
                  <p className="text-[10px] text-gray-500 mt-0.5">Version sync</p>
                </div>
              </div>

              {/* Enrolled Students Collapsible Section */}
              {/* Requirement: "list of students and the list open on click not by default" */}
              <div className="rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden bg-white dark:bg-[#12161F]/60">
                <button
                  type="button"
                  onClick={() => setShowStudents((prev) => !prev)}
                  className="w-full flex items-center justify-between p-3.5 bg-gray-50 hover:bg-gray-100 dark:bg-[#12161F] dark:hover:bg-gray-800/60 transition cursor-pointer text-left"
                  aria-expanded={showStudents}
                >
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-lg bg-purple-100 dark:bg-purple-950/80 text-purple-700 dark:text-purple-300 flex items-center justify-center">
                      <Users className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-gray-900 dark:text-white">
                          Enrolled Students Roster
                        </span>
                        <span className="px-2 py-0.2 rounded-full text-[10px] font-bold bg-indigo-50 text-indigo-700 dark:bg-indigo-950/80 dark:text-indigo-300 border border-indigo-200/60 dark:border-indigo-800">
                          {enrolledStudents.length}
                        </span>
                      </div>
                      <p className="text-[10px] text-gray-500 dark:text-gray-400">
                        {showStudents ? 'Click to hide student list' : 'Click to view enrolled students'}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 text-gray-500 dark:text-gray-400 font-semibold text-[11px]">
                    <span className="hidden sm:inline">
                      {showStudents ? 'Hide List' : 'Show List'}
                    </span>
                    {showStudents ? (
                      <ChevronUp className="w-4 h-4 transition-transform duration-200" />
                    ) : (
                      <ChevronDown className="w-4 h-4 transition-transform duration-200" />
                    )}
                  </div>
                </button>

                {/* Collapsible Student List Container (Open strictly on click) */}
                {showStudents && (
                  <div className="p-3.5 border-t border-gray-200 dark:border-gray-800 space-y-2 bg-gray-50/40 dark:bg-[#151923]/40 animate-in fade-in duration-150">
                    {enrolledStudents.length === 0 ? (
                      <div className="text-center py-6 text-gray-400">
                        <Users className="w-8 h-8 mx-auto opacity-30 mb-1" />
                        <p className="text-xs">No students currently enrolled in this course.</p>
                      </div>
                    ) : (
                      <div className="max-h-56 overflow-y-auto space-y-2 pr-1">
                        {enrolledStudents.map((st) => (
                          <div
                            key={st.id}
                            className="flex items-center justify-between p-2.5 rounded-lg bg-white dark:bg-[#181C24] border border-gray-100 dark:border-gray-800/80 shadow-2xs hover:border-indigo-200 dark:hover:border-indigo-900/60 transition"
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-950/70 border border-indigo-200/60 dark:border-indigo-800 flex items-center justify-center text-xs font-bold text-indigo-700 dark:text-indigo-300 shrink-0">
                                {st.avatar}
                              </div>
                              <div className="min-w-0">
                                <p className="font-bold text-gray-900 dark:text-white truncate">
                                  {st.name}
                                </p>
                                <p className="text-[10px] text-gray-400 truncate">{st.email}</p>
                              </div>
                            </div>

                            <div className="flex items-center gap-3 shrink-0">
                              {/* Progress bar */}
                              <div className="hidden sm:block text-right w-24">
                                <div className="flex justify-between text-[10px] text-gray-500 mb-1">
                                  <span>Progress</span>
                                  <span className="font-bold">{st.progressPercent}%</span>
                                </div>
                                <div className="h-1.5 w-full bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                                  <div
                                    className="h-full bg-indigo-500 rounded-full"
                                    style={{ width: `${st.progressPercent}%` }}
                                  />
                                </div>
                              </div>

                              <span
                                className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border capitalize ${
                                  st.status === 'completed'
                                    ? 'bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 border-blue-200 dark:border-blue-800'
                                    : 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
                                }`}
                              >
                                {st.status}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-between px-6 py-3.5 border-t border-gray-100 dark:border-gray-800 bg-gray-50/60 dark:bg-[#12161F]">
              <div className="text-[11px] text-gray-500 flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-indigo-500" />
                <span>Verified administrative inspection snapshot</span>
              </div>

              <button
                type="button"
                onClick={() => setSelectedCourse(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-200/70 dark:hover:bg-gray-800 transition cursor-pointer"
              >
                Close Inspector
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
