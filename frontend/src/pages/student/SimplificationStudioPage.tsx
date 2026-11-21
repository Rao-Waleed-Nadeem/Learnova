import React, { useState, useEffect, useRef } from 'react';
import {
  Sparkles,
  ArrowLeft,
  Send,
  Paperclip,
  Check,
  Bot,
  User as UserIcon,
  Clock,
  HelpCircle,
  ShieldCheck,
  ChevronDown,
  ChevronUp,
  FileText,
  Code,
  Video,
  ExternalLink,
  BookOpen,
} from 'lucide-react';
import { Course, Topic, Lesson, LearningResource } from '../../types';
import { aiApi, AISessionMessageItem, AIAttachmentItem } from '../../services/api/aiApi';
import { RichMarkdownRenderer } from '../../components/common/RichMarkdownRenderer';
import { StudentNavigationPage } from '../../components/student/StudentLayout';

interface SimplificationStudioPageProps {
  courseId: string;
  topicId: string;
  lessonId: string;
  courses: Course[];
  topics: Topic[];
  lessons: Lesson[];
  resources: LearningResource[];
  onNavigate: (page: StudentNavigationPage, params?: Record<string, string>) => void;
}

export const SimplificationStudioPage: React.FC<SimplificationStudioPageProps> = ({
  courseId,
  topicId,
  lessonId,
  courses,
  topics,
  lessons,
  resources,
  onNavigate,
}) => {
  const course = courses.find((c) => c.id === courseId) || courses[0];
  const topic = topics.find((t) => t.id === topicId) || topics[0];
  const lesson = lessons.find((l) => l.id === lessonId) || lessons[0];

  const lessonResources = resources.filter((r) => r.lessonId === lesson?.id);

  const [sessionId, setSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<AISessionMessageItem[]>([]);
  const [customPrompt, setCustomPrompt] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isInitializing, setIsInitializing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Attachments state - placed beside chat composer
  const [selectedAttachmentIds, setSelectedAttachmentIds] = useState<string[]>([]);
  const [isAttachmentsTrayOpen, setIsAttachmentsTrayOpen] = useState(false);

  // Expandable user messages state (track expanded message IDs)
  const [expandedUserMessages, setExpandedUserMessages] = useState<Record<string, boolean>>({});

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  // Connect to persistent session on mount
  useEffect(() => {
    if (!course?.id) return;

    let isMounted = true;
    const initSession = async () => {
      setIsInitializing(true);
      setError(null);
      try {
        const session = await aiApi.getOrCreateSession({
          session_type: 'lesson_tutoring',
          course_id: course.id,
          topic_id: topic?.id,
          lesson_id: lesson?.id,
          title: `Tutoring: ${lesson?.title || 'Lesson'}`,
        });

        if (!isMounted) return;
        setSessionId(session.id);

        const history = await aiApi.getSessionMessages(session.id);
        if (isMounted) {
          setMessages(history);
        }
      } catch (err: any) {
        console.error('Studio session init error:', err);
        if (isMounted) {
          setError(err?.message || 'Could not connect to persistent AI session.');
        }
      } finally {
        if (isMounted) {
          setIsInitializing(false);
        }
      }
    };

    initSession();
    return () => {
      isMounted = false;
    };
  }, [course?.id, topic?.id, lesson?.id]);

  const toggleAttachment = (id: string) => {
    setSelectedAttachmentIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const toggleMessageExpansion = (msgId: string) => {
    setExpandedUserMessages((prev) => ({
      ...prev,
      [msgId]: !prev[msgId],
    }));
  };

  const getSelectedAttachmentsPayload = (): AIAttachmentItem[] => {
    return lessonResources
      .filter((r) => selectedAttachmentIds.includes(r.id))
      .map((r) => ({
        id: r.id,
        title: r.title,
        type: r.type,
        content: r.contentOrUrl,
      }));
  };

  const handleSendMessage = async (
    text: string,
    mode: 'simplify' | 'analogy' | 'example' | 'diagram' | 'custom' = 'custom'
  ) => {
    if (!text.trim() || isLoading) return;

    const attachedPayload = getSelectedAttachmentsPayload();
    setIsLoading(true);
    setError(null);

    // Optimistic user message
    const tempUserMsg: AISessionMessageItem = {
      id: `temp-${Date.now()}`,
      session_id: sessionId || 'temp',
      sender: 'user',
      content: text,
      attachments: attachedPayload,
      raw_metadata: { mode },
      created_at: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, tempUserMsg]);
    setCustomPrompt('');

    try {
      if (sessionId) {
        const agentMsg = await aiApi.sendSessionMessage(sessionId, {
          content: text,
          mode,
          attachments: attachedPayload,
        });
        setMessages((prev) => [...prev, agentMsg]);
      } else {
        const fallbackRes = await aiApi.simplifyLesson({
          lessonId: lesson?.id,
          lessonTitle: lesson?.title,
          topicTitle: topic?.title,
          courseTitle: course?.title,
          lessonContent: lesson?.description,
          mode,
          customPrompt: text,
        });
        const fallbackAgentMsg: AISessionMessageItem = {
          id: `agent-${Date.now()}`,
          session_id: 'legacy',
          sender: 'agent',
          content: fallbackRes.explanation,
          attachments: [],
          raw_metadata: { source: fallbackRes.source },
          created_at: new Date().toISOString(),
        };
        setMessages((prev) => [...prev, fallbackAgentMsg]);
      }
    } catch (err: any) {
      console.error('Studio send message error:', err);
      setError(err?.message || 'Could not complete message exchange with AGY agent.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-4 max-w-5xl mx-auto pb-10 view-enter-animation">
      {/* Top Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-gray-200 dark:border-gray-800">
        <button
          type="button"
          onClick={() =>
            onNavigate('lesson', {
              courseId: course.id,
              topicId: topic.id,
              lessonId: lesson.id,
            })
          }
          className="inline-flex items-center gap-2 text-xs sm:text-sm font-semibold text-gray-600 dark:text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Lesson Workspace</span>
        </button>

        <div className="flex items-center gap-2.5">
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300 text-xs font-semibold">
            <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
            <span>AI Simplification Studio</span>
          </div>
          <div className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 text-[11px] font-semibold">
            <ShieldCheck className="w-3 h-3 text-emerald-500" />
            <span>Persistent Session</span>
          </div>
        </div>
      </div>

      {/* Full-Width ChatGPT-Grade Studio Container */}
      <div className="bg-white dark:bg-[#181C24] border border-[#D9DEE7] dark:border-[#2D3545] rounded-2xl shadow-xs flex flex-col h-[780px] overflow-hidden">
        {/* Chat Stream Top Info Bar */}
        <div className="px-5 py-3.5 border-b border-gray-200 dark:border-gray-800 bg-gray-50/60 dark:bg-[#1C212B] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-bold text-xs shadow-xs">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-xs sm:text-sm font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <span>{lesson?.title || 'Lesson Studio'}</span>
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                  Unit {lesson?.order || 1}
                </span>
              </h3>
              <p className="text-[11px] text-gray-500 dark:text-gray-400">
                {course.title} • {topic?.title}
              </p>
            </div>
          </div>

          <span className="text-[11px] text-gray-500 dark:text-gray-400 hidden sm:inline-block">
            Mermaid.js vector diagrams & code walkthroughs supported
          </span>
        </div>

        {/* Conversation Stream Scrollport */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
          {isInitializing && (
            <div className="p-10 text-center space-y-3">
              <div className="w-8 h-8 mx-auto border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
              <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">
                Connecting to persistent AI tutoring session...
              </p>
            </div>
          )}

          {error && (
            <div className="p-4 rounded-xl border border-rose-200 dark:border-rose-800 bg-rose-50 dark:bg-rose-950/30 text-rose-800 dark:text-rose-200 text-xs flex items-start gap-2.5">
              <HelpCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="font-bold">Error exchanging with tutor agent</p>
                <p className="mt-0.5 leading-relaxed">{error}</p>
              </div>
            </div>
          )}

          {/* Empty Conversation Welcome State */}
          {!isInitializing && messages.length === 0 && (
            <div className="py-12 px-4 text-center max-w-md mx-auto space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mx-auto shadow-xs">
                <Bot className="w-6 h-6" />
              </div>
              <div>
                <h4 className="text-base font-bold text-gray-900 dark:text-white">
                  Welcome to the AI Simplification Studio
                </h4>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 leading-relaxed">
                  Ask any question about <strong>{lesson?.title}</strong>, request an architecture diagram, worked code walkthrough, or real-world analogy.
                </p>
              </div>
              {lessonResources.length > 0 && (
                <div className="pt-2">
                  <button
                    type="button"
                    onClick={() => setIsAttachmentsTrayOpen(true)}
                    className="inline-flex items-center gap-1.5 text-xs text-indigo-600 dark:text-indigo-400 hover:underline font-semibold cursor-pointer"
                  >
                    <Paperclip className="w-3.5 h-3.5" />
                    <span>Attach lesson media from syllabus ({lessonResources.length} available)</span>
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Messages Stream */}
          {messages.map((msg) => {
            const isUser = msg.sender === 'user';
            const isExpanded = expandedUserMessages[msg.id];
            const lines = (msg.content || '').split('\n');
            const isLongPrompt = isUser && (lines.length > 5 || msg.content.length > 260);

            if (isUser) {
              return (
                <div key={msg.id} className="flex flex-col items-end gap-1">
                  <div className="max-w-[80%] sm:max-w-[70%] md:max-w-[62%] bg-indigo-600 text-white rounded-2xl rounded-tr-xs p-4 sm:p-5 shadow-sm text-xs sm:text-sm">
                    {/* Attachments pills in message */}
                    {msg.attachments && msg.attachments.length > 0 && (
                      <div className="mb-2.5 flex flex-wrap gap-1.5">
                        {msg.attachments.map((att: any, i: number) => (
                          <span
                            key={i}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[10px] font-semibold bg-indigo-700/90 text-indigo-100"
                          >
                            <Paperclip className="w-3 h-3" />
                            <span>{att.title || 'Attached Resource'}</span>
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Expandable text body: show top 5-6 lines if lengthy */}
                    <div
                      className={`whitespace-pre-wrap font-sans leading-relaxed transition-all ${
                        isLongPrompt && !isExpanded ? 'line-clamp-5 max-h-[140px] overflow-hidden' : ''
                      }`}
                    >
                      {msg.content}
                    </div>

                    {/* Expand/Collapse toggle for lengthy user prompts */}
                    {isLongPrompt && (
                      <button
                        type="button"
                        onClick={() => toggleMessageExpansion(msg.id)}
                        className="mt-2.5 inline-flex items-center gap-1 text-[11px] font-bold text-indigo-200 hover:text-white transition cursor-pointer"
                      >
                        {isExpanded ? (
                          <>
                            <ChevronUp className="w-3.5 h-3.5" />
                            <span>Show less</span>
                          </>
                        ) : (
                          <>
                            <ChevronDown className="w-3.5 h-3.5" />
                            <span>Show full prompt ({lines.length} lines)</span>
                          </>
                        )}
                      </button>
                    )}

                    {/* Timestamp */}
                    <div className="mt-2.5 pt-2 border-t border-indigo-500/40 flex items-center justify-end gap-1.5 text-[10px] text-indigo-200">
                      <Clock className="w-3 h-3" />
                      <span>
                        {msg.created_at
                          ? new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                          : 'Just now'}
                      </span>
                    </div>
                  </div>
                </div>
              );
            }

            // Agent Message: Covers the whole area (full width)
            return (
              <div key={msg.id} className="w-full flex gap-3.5 items-start">
                <div className="w-8 h-8 rounded-xl bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0 mt-1 shadow-2xs">
                  <Bot className="w-4 h-4" />
                </div>

                <div className="flex-1 min-w-0 bg-gray-50 dark:bg-[#1C212B] border border-gray-200 dark:border-gray-800 rounded-2xl rounded-tl-xs p-5 sm:p-6 text-xs sm:text-sm leading-relaxed text-gray-800 dark:text-gray-200 shadow-xs">
                  {/* Rich markdown formatting and Mermaid diagrams covering full width */}
                  <RichMarkdownRenderer content={msg.content} />

                  {/* Footer telemetry */}
                  <div className="mt-4 pt-3 border-t border-gray-200 dark:border-gray-800 flex items-center justify-between text-[10px] text-gray-400">
                    <div className="flex items-center gap-1.5">
                      <Clock className="w-3 h-3" />
                      <span>
                        {msg.created_at
                          ? new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                          : 'Just now'}
                      </span>
                      {msg.raw_metadata?.source && (
                        <span>• {msg.raw_metadata.source === 'agy_cli' ? 'AGY Terminal' : 'Curriculum Grounded'}</span>
                      )}
                    </div>
                    <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">
                      Syllabus Invariant Verified
                    </span>
                  </div>
                </div>
              </div>
            );
          })}

          {isLoading && (
            <div className="w-full flex gap-3.5 items-start">
              <div className="w-8 h-8 rounded-xl bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0 shadow-2xs">
                <Bot className="w-4 h-4 animate-pulse" />
              </div>
              <div className="p-4 rounded-2xl bg-gray-50 dark:bg-[#1C212B] border border-gray-200 dark:border-gray-800 text-xs text-gray-500 flex items-center gap-2.5 shadow-xs">
                <div className="w-3.5 h-3.5 rounded-full border-2 border-indigo-600 border-t-transparent animate-spin" />
                <span>AGY Academic Tutor is formulating explanation & diagram...</span>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Attached Lesson Media Panel (Beside / Directly Above Chat Composer) */}
        {isAttachmentsTrayOpen && lessonResources.length > 0 && (
          <div className="px-5 py-3 border-t border-gray-200 dark:border-gray-800 bg-indigo-50/40 dark:bg-[#151922] transition-all">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2 text-xs font-bold text-gray-700 dark:text-gray-300">
                <Paperclip className="w-3.5 h-3.5 text-indigo-600" />
                <span>Attach Syllabus Resources to Next Inquiry ({selectedAttachmentIds.length}/{lessonResources.length} selected)</span>
              </div>
              <button
                type="button"
                onClick={() => setIsAttachmentsTrayOpen(false)}
                className="text-xs text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 cursor-pointer"
              >
                Close
              </button>
            </div>

            <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto py-1">
              {lessonResources.map((res) => {
                const isChecked = selectedAttachmentIds.includes(res.id);
                return (
                  <button
                    key={res.id}
                    type="button"
                    onClick={() => toggleAttachment(res.id)}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs transition cursor-pointer ${
                      isChecked
                        ? 'border-indigo-500 bg-indigo-100/70 dark:bg-indigo-950/60 text-indigo-900 dark:text-indigo-200 font-bold'
                        : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-[#1C212B] text-gray-700 dark:text-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    <div className={`w-3.5 h-3.5 rounded flex items-center justify-center border text-[9px] ${
                      isChecked ? 'bg-indigo-600 text-white border-indigo-600' : 'border-gray-400'
                    }`}>
                      {isChecked && <Check className="w-2.5 h-2.5" />}
                    </div>
                    <span className="truncate max-w-[180px]">{res.title}</span>
                    <span className="text-[10px] uppercase text-gray-400 shrink-0">({res.type})</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Bottom Chat Composer Dock */}
        <div className="p-4 border-t border-gray-200 dark:border-gray-800 bg-white dark:bg-[#181C24] shrink-0">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage(customPrompt, 'custom');
            }}
            className="flex items-center gap-2.5"
          >
            {/* Attached Media Button Beside Input */}
            {lessonResources.length > 0 && (
              <button
                type="button"
                onClick={() => setIsAttachmentsTrayOpen((prev) => !prev)}
                className={`p-2.5 rounded-xl border text-xs font-semibold flex items-center gap-1.5 shrink-0 transition cursor-pointer ${
                  selectedAttachmentIds.length > 0 || isAttachmentsTrayOpen
                    ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 shadow-2xs'
                    : 'border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-400'
                }`}
                title="Attach lesson resources beside chat"
              >
                <Paperclip className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                <span className="hidden sm:inline">
                  {selectedAttachmentIds.length > 0 ? `${selectedAttachmentIds.length} Attached` : 'Attach Media'}
                </span>
                {selectedAttachmentIds.length > 0 && (
                  <span className="w-4 h-4 rounded-full bg-indigo-600 text-white text-[10px] font-bold flex items-center justify-center sm:hidden">
                    {selectedAttachmentIds.length}
                  </span>
                )}
              </button>
            )}

            {/* Chat Input Field */}
            <div className="relative flex-1">
              <input
                type="text"
                value={customPrompt}
                onChange={(e) => setCustomPrompt(e.target.value)}
                placeholder="Ask any question about this lesson, request a diagram, or prompt..."
                disabled={isLoading || isInitializing}
                className="w-full bg-gray-50/80 dark:bg-[#12161F] border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-2.5 text-xs sm:text-sm text-gray-900 dark:text-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-2xs transition"
              />
            </div>

            {/* Send Button */}
            <button
              type="submit"
              aria-label="Send message to AGY tutor"
              disabled={isLoading || isInitializing || !customPrompt.trim()}
              className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs flex items-center gap-1.5 transition shadow-xs disabled:opacity-40 disabled:cursor-not-allowed shrink-0 cursor-pointer"
            >
              <Send className="w-4 h-4" />
              <span className="hidden sm:inline">Send</span>
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
