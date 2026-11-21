import React, { useState, useEffect, useRef } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  BookOpen,
  ArrowRight,
  Layers,
  Award,
  Sparkles,
  CheckCircle2,
} from 'lucide-react';
import { Course, Topic, Lesson, Enrollment } from '../../types';

interface CourseCarouselProps {
  courses: Course[];
  topics: Topic[];
  lessons: Lesson[];
  enrollments?: Enrollment[];
  onSelectCourse: (courseId: string) => void;
}

interface TiltCardProps {
  course: Course;
  courseTopics: Topic[];
  courseLessons: Lesson[];
  avgThreshold: number;
  isEnrolled: boolean;
  onSelect: () => void;
}

const TiltCard: React.FC<TiltCardProps> = ({
  course,
  courseTopics,
  courseLessons,
  avgThreshold,
  isEnrolled,
  onSelect,
}) => {
  const cardRef = useRef<HTMLDivElement>(null);
  const [tilt, setTilt] = useState({ x: 0, y: 0, glowX: 50, glowY: 50 });
  const [isHovered, setIsHovered] = useState(false);

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;

    // Subtle 3D tilt calculation (-10 to +10 degrees)
    const tiltX = (y - 0.5) * -12;
    const tiltY = (x - 0.5) * 12;

    setTilt({
      x: tiltX,
      y: tiltY,
      glowX: x * 100,
      glowY: y * 100,
    });
  };

  const handlePointerLeave = () => {
    setIsHovered(false);
    setTilt({ x: 0, y: 0, glowX: 50, glowY: 50 });
  };

  return (
    <div
      ref={cardRef}
      onPointerEnter={() => setIsHovered(true)}
      onPointerMove={handlePointerMove}
      onPointerLeave={handlePointerLeave}
      style={{
        transform: isHovered
          ? `perspective(1000px) rotateX(${tilt.x}deg) rotateY(${tilt.y}deg) translateY(-6px) scale3d(1.02, 1.02, 1.02)`
          : 'perspective(1000px) rotateX(0deg) rotateY(0deg) translateY(0px) scale3d(1, 1, 1)',
        transition: isHovered ? 'transform 0.1s ease-out' : 'transform 0.4s cubic-bezier(0.2, 0.8, 0.2, 1)',
      }}
      className="group relative flex flex-col justify-between h-full p-6 sm:p-7 rounded-3xl bg-white dark:bg-[#121724] border border-gray-200/90 dark:border-gray-800/90 shadow-md hover:shadow-2xl hover:border-indigo-400/60 dark:hover:border-indigo-500/60 transition-colors duration-300 overflow-hidden cursor-pointer select-none"
      onClick={onSelect}
    >
      {/* Dynamic Cursor-Tracked Radial Glow Spotlight */}
      <div
        className="pointer-events-none absolute -inset-px rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"
        style={{
          background: `radial-gradient(400px circle at ${tilt.glowX}% ${tilt.glowY}%, rgba(99, 102, 241, 0.15), transparent 70%)`,
        }}
      />

      {/* Top Accent Neon Line */}
      <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-transparent via-indigo-500/40 to-transparent group-hover:via-indigo-500 group-hover:h-1.5 transition-all duration-300" />

      {/* Card Header: Code Badge & Status */}
      <div className="relative space-y-4">
        <div className="flex items-center justify-between gap-2">
          <span className="px-3 py-1 rounded-lg text-xs font-mono font-bold uppercase bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200/60 dark:border-indigo-800/60 group-hover:scale-105 transition-transform">
            {course.id.replace('course-', '').toUpperCase()}
          </span>

          {isEnrolled ? (
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border border-emerald-200/60 dark:border-emerald-800/60">
              <CheckCircle2 className="w-3 h-3" />
              <span>Enrolled</span>
            </span>
          ) : (
            <span className="text-[11px] font-mono text-gray-500 dark:text-gray-400 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              Live Course
            </span>
          )}
        </div>

        {/* Course Title - Crisp & Punchy */}
        <h4 className="text-lg sm:text-xl font-black tracking-tight text-gray-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors line-clamp-2 leading-snug">
          {course.title}
        </h4>

        {/* Concise Description (Minimal text) */}
        <p className="text-xs text-gray-600 dark:text-gray-300 line-clamp-2 leading-relaxed">
          {course.description}
        </p>

        {/* Visual Pill Metrics (Topics, Lessons, BKT) */}
        <div className="grid grid-cols-3 gap-2 pt-2 text-center">
          <div className="p-2 rounded-xl bg-gray-50 dark:bg-[#182030] border border-gray-100 dark:border-gray-800">
            <Layers className="w-3.5 h-3.5 text-indigo-500 mx-auto mb-1" />
            <span className="text-xs font-mono font-bold text-gray-900 dark:text-white block">
              {courseTopics.length}
            </span>
            <span className="text-[10px] text-gray-500 dark:text-gray-400 uppercase tracking-wider block">
              Topics
            </span>
          </div>

          <div className="p-2 rounded-xl bg-gray-50 dark:bg-[#182030] border border-gray-100 dark:border-gray-800">
            <BookOpen className="w-3.5 h-3.5 text-emerald-500 mx-auto mb-1" />
            <span className="text-xs font-mono font-bold text-gray-900 dark:text-white block">
              {courseLessons.length}
            </span>
            <span className="text-[10px] text-gray-500 dark:text-gray-400 uppercase tracking-wider block">
              Lessons
            </span>
          </div>

          <div className="p-2 rounded-xl bg-gray-50 dark:bg-[#182030] border border-gray-100 dark:border-gray-800">
            <Award className="w-3.5 h-3.5 text-amber-500 mx-auto mb-1" />
            <span className="text-xs font-mono font-bold text-gray-900 dark:text-white block">
              {avgThreshold}%
            </span>
            <span className="text-[10px] text-gray-500 dark:text-gray-400 uppercase tracking-wider block">
              BKT Goal
            </span>
          </div>
        </div>
      </div>

      {/* Card Footer: Instructor & CTA Button */}
      <div className="relative pt-6 mt-6 border-t border-gray-100 dark:border-gray-800/80 space-y-4">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-8 h-8 rounded-full bg-indigo-600 text-white font-bold text-xs shadow-sm shrink-0">
            {course.creatorAvatar ||
              course.creatorName
                ?.split(' ')
                .map((n) => n[0])
                .join('') ||
              'FC'}
          </div>
          <div className="min-w-0 flex-1">
            <span className="text-xs font-bold text-gray-900 dark:text-white block truncate">
              {course.creatorName}
            </span>
            <span className="text-[11px] text-gray-500 dark:text-gray-400 block truncate">
              {course.creatorDepartment}
            </span>
          </div>
        </div>

        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onSelect();
          }}
          className="w-full group/btn flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600 text-white text-xs font-bold shadow-sm shadow-indigo-600/20 group-hover:shadow-md group-hover:shadow-indigo-600/30 active:scale-95 transition-all duration-200 cursor-pointer"
        >
          <span>Inspect Course Syllabus</span>
          <ArrowRight className="w-3.5 h-3.5 group-hover/btn:translate-x-1 transition-transform" />
        </button>
      </div>
    </div>
  );
};

export const CourseCarousel: React.FC<CourseCarouselProps> = ({
  courses,
  topics,
  lessons,
  enrollments = [],
  onSelectCourse,
}) => {
  const [activeIndex, setActiveIndex] = useState(0);
  const [visibleCount, setVisibleCount] = useState<number>(3);
  const touchStartX = useRef<number | null>(null);

  // Responsive visible cards: 1 on mobile, 2 on tablet, 3 on desktop
  useEffect(() => {
    const updateVisibleCount = () => {
      if (typeof window === 'undefined') return;
      if (window.innerWidth < 640) {
        setVisibleCount(1);
      } else if (window.innerWidth < 1024) {
        setVisibleCount(2);
      } else {
        setVisibleCount(3);
      }
    };

    updateVisibleCount();
    window.addEventListener('resize', updateVisibleCount);
    return () => window.removeEventListener('resize', updateVisibleCount);
  }, []);

  const totalCourses = courses.length;
  // Maximum valid index ensuring remaining view is fully populated
  const maxIndex = Math.max(0, totalCourses - visibleCount);

  // Clamp activeIndex if screen resized
  useEffect(() => {
    if (activeIndex > maxIndex) {
      setActiveIndex(maxIndex);
    }
  }, [maxIndex, activeIndex]);

  const handlePrev = () => {
    setActiveIndex((prev) => (prev <= 0 ? maxIndex : prev - 1));
  };

  const handleNext = () => {
    setActiveIndex((prev) => (prev >= maxIndex ? 0 : prev + 1));
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null) return;
    const diff = touchStartX.current - e.changedTouches[0].clientX;
    if (Math.abs(diff) > 40) {
      if (diff > 0) {
        handleNext();
      } else {
        handlePrev();
      }
    }
    touchStartX.current = null;
  };

  const enrolledCourseIds = new Set(enrollments.map((e) => e.courseId));

  return (
    <div
      className="relative w-full space-y-6"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      aria-roledescription="carousel"
      aria-label="Academic Courses Carousel"
    >
      {/* Header Bar: Canonical Curriculum + Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200/60 dark:border-indigo-800/60 text-xs font-mono font-bold text-indigo-700 dark:text-indigo-300 mb-2">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Interactive Multi-Card Carousel (3 Per Grid)</span>
          </div>
          <h3 className="text-2xl sm:text-3xl font-black tracking-tight text-gray-900 dark:text-white">
            Canonical Academic Curriculum
          </h3>
          <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mt-1">
            Directed Acyclic Graphs with Bayesian Knowledge Tracing benchmarks.
          </p>
        </div>

        {/* Carousel Navigation Buttons */}
        <div className="flex items-center gap-2.5 self-end sm:self-center">
          <button
            type="button"
            onClick={handlePrev}
            className="p-2.5 rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-[#151B28] text-gray-700 dark:text-gray-300 hover:text-indigo-600 dark:hover:text-indigo-400 hover:border-indigo-300 dark:hover:border-indigo-700 shadow-sm active:scale-95 transition-all cursor-pointer"
            aria-label="Previous courses"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <button
            type="button"
            onClick={handleNext}
            className="p-2.5 rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-[#151B28] text-gray-700 dark:text-gray-300 hover:text-indigo-600 dark:hover:text-indigo-400 hover:border-indigo-300 dark:hover:border-indigo-700 shadow-sm active:scale-95 transition-all cursor-pointer"
            aria-label="Next courses"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Carousel Viewport: 3 Cards Per Grid Row on Desktop */}
      <div className="overflow-hidden rounded-3xl p-1 -m-1">
        <div
          className="flex transition-transform duration-500 ease-out"
          style={{
            transform: `translateX(-${activeIndex * (100 / visibleCount)}%)`,
          }}
        >
          {courses.map((course) => {
            const courseTopics = topics.filter((t) => t.courseId === course.id);
            const courseLessons = lessons.filter((l) => l.courseId === course.id);
            const avgThreshold =
              courseTopics.length > 0
                ? Math.round(
                    courseTopics.reduce((acc, t) => acc + (t.masteryThreshold || 75), 0) /
                      courseTopics.length
                  )
                : 80;

            const isEnrolled = enrolledCourseIds.has(course.id);

            return (
              <div
                key={course.id}
                className="w-full sm:w-1/2 lg:w-1/3 shrink-0 p-2 sm:p-3"
              >
                <TiltCard
                  course={course}
                  courseTopics={courseTopics}
                  courseLessons={courseLessons}
                  avgThreshold={avgThreshold}
                  isEnrolled={isEnrolled}
                  onSelect={() => onSelectCourse(course.id)}
                />
              </div>
            );
          })}
        </div>
      </div>

      {/* Pagination Dots */}
      {maxIndex > 0 && (
        <div className="flex items-center justify-center gap-2 pt-2">
          {Array.from({ length: maxIndex + 1 }).map((_, dotIdx) => {
            const isActive = dotIdx === activeIndex;
            return (
              <button
                key={dotIdx}
                type="button"
                onClick={() => setActiveIndex(dotIdx)}
                className={`h-2 rounded-full transition-all duration-300 cursor-pointer ${
                  isActive
                    ? 'w-8 bg-indigo-600 dark:bg-indigo-400'
                    : 'w-2 bg-gray-300 dark:bg-gray-700 hover:bg-gray-400 dark:hover:bg-gray-600'
                }`}
                aria-label={`Go to slide group ${dotIdx + 1}`}
                aria-current={isActive}
              />
            );
          })}
        </div>
      )}
    </div>
  );
};
