import React, { useState, useEffect } from 'react';
import {
  Course,
  Topic,
  Lesson,
  LearningResource,
} from '../../types';
import {
  ArrowLeft,
  ArrowRight,
  Sparkles,
  CheckCircle2,
  FileText,
  Code,
  Video,
  ExternalLink,
  Copy,
  Check,
  BookOpen,
  Download,
} from 'lucide-react';
import { StudentNavigationPage } from '../../components/student/StudentLayout';
import { RichMarkdownRenderer } from '../../components/common/RichMarkdownRenderer';
import { curriculumApi } from '../../services/api/curriculumApi';

interface LessonWorkspacePageProps {
  courseId: string;
  topicId: string;
  lessonId: string;
  courses: Course[];
  topics: Topic[];
  lessons: Lesson[];
  resources: LearningResource[];
  isCompleted: boolean;
  onMarkComplete: (lessonId: string, courseId: string, topicId: string) => void;
  onNavigate: (page: StudentNavigationPage, params?: Record<string, string>) => void;
}

export const LessonWorkspacePage: React.FC<LessonWorkspacePageProps> = ({
  courseId,
  topicId,
  lessonId,
  courses,
  topics,
  lessons,
  resources,
  isCompleted,
  onMarkComplete,
  onNavigate,
}) => {
  const [copiedCodeId, setCopiedCodeId] = useState<string | null>(null);

  const course = courses.find((c) => c.id === courseId) || courses[0];
  const topic = topics.find((t) => t.id === topicId) || topics[0];
  const propLesson = lessons.find((l) => l.id === lessonId) || lessons[0];

  const [liveLesson, setLiveLesson] = useState<Lesson | null>(null);
  const [liveResources, setLiveResources] = useState<LearningResource[] | null>(null);
  const [isLoadingLesson, setIsLoadingLesson] = useState(false);

  // Authoritatively fetch fresh lesson details and instructional introduction from the database
  const activeLessonId = lessonId || propLesson?.id;

  useEffect(() => {
    let isMounted = true;
    if (!activeLessonId) return;

    setIsLoadingLesson(true);
    curriculumApi
      .getLesson(activeLessonId)
      .then((data) => {
        if (!isMounted) return;
        setLiveLesson({
          id: data.id,
          topicId: data.topic_id,
          courseId: data.course_id || courseId,
          title: data.title,
          description: data.description || '',
          order: data.order,
          createdAt: data.created_at,
          updatedAt: data.updated_at,
        });

        if (Array.isArray(data.resources) && data.resources.length > 0) {
          setLiveResources(
            data.resources.map((r) => ({
              id: r.id,
              lessonId: r.lesson_id,
              courseId: r.course_id || courseId,
              title: r.title,
              type: r.type,
              contentOrUrl: r.content_or_url,
              fileSize: r.file_size_bytes ? `${Math.round(r.file_size_bytes / 1024)} KB` : undefined,
              createdAt: r.created_at,
            }))
          );
        }
      })
      .catch((err) => {
        // Fall back gracefully to local curriculum data if offline or network error
        console.warn('Could not fetch authoritative lesson from server:', err);
      })
      .finally(() => {
        if (isMounted) setIsLoadingLesson(false);
      });

    return () => {
      isMounted = false;
    };
  }, [activeLessonId, courseId]);

  const lesson = liveLesson || propLesson;

  const topicLessons = lessons.filter((l) => l.topicId === topic?.id).sort((a, b) => a.order - b.order);
  const currentIdx = topicLessons.findIndex((l) => l.id === lesson?.id);
  const prevLesson = currentIdx > 0 ? topicLessons[currentIdx - 1] : null;
  const nextLesson = currentIdx >= 0 && currentIdx < topicLessons.length - 1 ? topicLessons[currentIdx + 1] : null;

  const lessonResources = liveResources || resources.filter((r) => r.lessonId === lesson?.id);

  const handleCopyCode = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedCodeId(id);
    curriculumApi.recordResourceActivity(id, { event_type: 'read', duration_seconds: 15 }).catch(() => {});
    setTimeout(() => setCopiedCodeId(null), 2000);
  };

  const handleResourceClick = (id: string, type: string) => {
    const event_type = type === 'video' ? 'watch' : 'read';
    curriculumApi.recordResourceActivity(id, { event_type, duration_seconds: 30 }).catch(() => {});
  };

  const handleComplete = () => {
    if (!isCompleted && lesson && course && topic) {
      onMarkComplete(lesson.id, course.id, topic.id);
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12 view-enter-animation">
      {/* Top Bar with Navigation & AI Helper Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <button
          type="button"
          onClick={() => onNavigate('course_map', { courseId: course.id })}
          className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-semibold text-gray-600 dark:text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Course Learning Map</span>
        </button>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() =>
              onNavigate('simplification_studio', {
                courseId: course.id,
                topicId: topic.id,
                lessonId: lesson.id,
              })
            }
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 border border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300 font-bold text-xs transition shadow-2xs cursor-pointer"
            title="Open dedicated Simplification Studio"
          >
            <Sparkles className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
            <span>Simplify with AI</span>
          </button>

          <button
            type="button"
            onClick={handleComplete}
            disabled={isCompleted}
            className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-xl font-bold text-xs transition shadow-2xs ${
              isCompleted
                ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 cursor-default'
                : 'bg-indigo-600 hover:bg-indigo-700 text-white cursor-pointer'
            }`}
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>{isCompleted ? 'Lesson Completed (+50 XP)' : 'Mark Lesson Complete'}</span>
          </button>
        </div>
      </div>

      {/* Main Workspace Card */}
      <div className="bg-white dark:bg-[#181C24] border border-[#D9DEE7] dark:border-[#2D3545] rounded-2xl p-6 sm:p-8 shadow-xs space-y-6">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
              Unit {lesson?.order || 1}
            </span>
            <span className="text-xs text-gray-500 dark:text-gray-400">
              {topic?.title}
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 dark:text-white">
            {lesson?.title}
          </h1>
        </div>

        {/* Learning Content & Lesson Overview */}
        <div className="pt-4 border-t border-gray-100 dark:border-gray-800">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 flex items-center gap-2">
              <FileText className="w-4 h-4 text-indigo-600" />
              <span>Instructional Notes & Introduction</span>
            </h3>
            {isLoadingLesson && (
              <span className="text-[11px] text-indigo-500 flex items-center gap-1.5 font-medium">
                <span className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse" />
                Syncing with server...
              </span>
            )}
          </div>
          {isLoadingLesson && !lesson?.description ? (
            <div className="p-6 rounded-2xl bg-gray-50/50 dark:bg-[#1C212B]/50 border border-gray-200/80 dark:border-gray-800/80 space-y-3 animate-pulse">
              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4"></div>
              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-5/6"></div>
              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
            </div>
          ) : lesson?.description?.trim() ? (
            <div className="prose dark:prose-invert max-w-none text-sm leading-relaxed text-gray-800 dark:text-gray-200 bg-gray-50/50 dark:bg-[#1C212B]/50 p-5 rounded-2xl border border-gray-200/80 dark:border-gray-800/80">
              <RichMarkdownRenderer content={lesson.description} />
            </div>
          ) : (
            <div className="p-5 rounded-2xl bg-gray-50/50 dark:bg-[#1C212B]/50 border border-gray-200/80 dark:border-gray-800/80 text-xs text-gray-500 dark:text-gray-400">
              No custom introduction written for this lesson yet. Review the official syllabus resources below or click "Simplify with AI" to generate an architectural breakdown.
            </div>
          )}
        </div>

        {/* Published Learning Resources Group */}
        <div className="pt-6 border-t border-gray-100 dark:border-gray-800 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-indigo-600" />
              <span>Published Learning Resources ({lessonResources.length})</span>
            </h3>
            <span className="text-xs text-gray-500 dark:text-gray-400">Official syllabus material</span>
          </div>

          {lessonResources.length > 0 ? (
            <div className="space-y-3">
              {lessonResources.map((res) => (
                <div
                  key={res.id}
                  className="p-4 rounded-xl border border-gray-200 dark:border-gray-800 bg-gray-50/50 dark:bg-[#1C212B] flex flex-col md:flex-row md:items-center justify-between gap-3"
                >
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-lg bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0 mt-0.5">
                      {res.type === 'document' ? (
                        <FileText className="w-4 h-4" />
                      ) : res.type === 'code' ? (
                        <Code className="w-4 h-4" />
                      ) : res.type === 'video' ? (
                        <Video className="w-4 h-4" />
                      ) : (
                        <ExternalLink className="w-4 h-4" />
                      )}
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-gray-900 dark:text-white">
                        {res.title}
                      </h4>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        Type: <span className="font-semibold uppercase">{res.type}</span> {res.fileSize ? `• ${res.fileSize}` : ''}
                      </p>

                      {/* If code snippet, preview code */}
                      {res.type === 'code' && (
                        <pre className="mt-2 p-3 rounded-lg bg-gray-900 text-gray-100 font-mono text-xs overflow-x-auto">
                          {res.contentOrUrl}
                        </pre>
                      )}

                      {/* If markdown notes, render markdown snippet */}
                      {res.type === 'markdown' && (
                        <div className="mt-2 p-3 rounded-lg bg-white dark:bg-[#181C24] border border-gray-200 dark:border-gray-800 text-xs font-mono text-gray-700 dark:text-gray-300">
                          {res.contentOrUrl}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-end md:self-center shrink-0">
                    {res.type === 'code' ? (
                      <button
                        type="button"
                        onClick={() => handleCopyCode(res.id, res.contentOrUrl)}
                        className="px-3 py-1.5 rounded-lg border border-gray-300 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800 text-xs font-semibold flex items-center gap-1.5 text-gray-700 dark:text-gray-300"
                      >
                        {copiedCodeId === res.id ? (
                          <>
                            <Check className="w-3.5 h-3.5 text-emerald-600" />
                            <span>Copied</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5" />
                            <span>Copy Code</span>
                          </>
                        )}
                      </button>
                    ) : (
                      <a
                        href={res.contentOrUrl}
                        target="_blank"
                        rel="noreferrer"
                        onClick={() => handleResourceClick(res.id, res.type)}
                        className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold flex items-center gap-1.5 transition"
                      >
                        <span>Open Resource</span>
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-gray-500 italic">No supplemental media uploaded for this unit.</p>
          )}
        </div>
      </div>

      {/* Lesson Navigation Footer: Previous / Next */}
      <div className="flex items-center justify-between border-t border-gray-200 dark:border-gray-800 pt-6">
        {prevLesson ? (
          <button
            type="button"
            onClick={() =>
              onNavigate('lesson', {
                courseId: course.id,
                topicId: topic.id,
                lessonId: prevLesson.id,
              })
            }
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-gray-300 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 text-xs sm:text-sm font-semibold text-gray-700 dark:text-gray-300 transition"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Previous: {prevLesson.title}</span>
          </button>
        ) : (
          <div />
        )}

        {nextLesson ? (
          <button
            type="button"
            onClick={() =>
              onNavigate('lesson', {
                courseId: course.id,
                topicId: topic.id,
                lessonId: nextLesson.id,
              })
            }
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs sm:text-sm font-semibold transition shadow-xs cursor-pointer"
          >
            <span>Next: {nextLesson.title}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        ) : (
          <button
            type="button"
            onClick={() => onNavigate('course_map', { courseId: course.id })}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs sm:text-sm font-semibold transition shadow-xs cursor-pointer"
          >
            <span>Return to Course Map</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
};
