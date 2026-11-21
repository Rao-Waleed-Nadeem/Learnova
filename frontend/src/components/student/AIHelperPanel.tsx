import React, { useState, useEffect, useRef } from 'react';
import {
  Sparkles,
  X,
  Send,
  BookOpen,
  Lightbulb,
  Code2,
  HelpCircle,
  Paperclip,
  Check,
  Bot,
  User as UserIcon,
  Clock,
  Layers,
  ChevronDown,
  ChevronUp,
  Maximize2,
  Eye,
} from 'lucide-react';
import { aiApi, AISessionMessageItem, AIAttachmentItem } from '../../services/api/aiApi';
import { LearningResource } from '../../types';
import { RichMarkdownRenderer } from '../common/RichMarkdownRenderer';

interface AIHelperPanelProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenFullStudio?: () => void;
  lessonTitle: string;
  topicTitle: string;
  courseTitle: string;
  lessonContent: string;
  lessonId?: string;
  courseId?: string;
  topicId?: string;
  resources?: LearningResource[];
}

export const AIHelperPanel: React.FC<AIHelperPanelProps> = ({
  isOpen,
  onClose,
  onOpenFullStudio,
  lessonTitle,
  topicTitle,
  courseTitle,
  lessonContent,
  lessonId,
  courseId,
  topicId,
  resources = [],
}) => {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<AISessionMessageItem[]>([]);
  const [customPrompt, setCustomPrompt] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isInitializing, setIsInitializing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Attachments state
  const [selectedAttachmentIds, setSelectedAttachmentIds] = useState<string[]>([]);
  const [isAttachmentsTrayOpen, setIsAttachmentsTrayOpen] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  // Initialize or resume persistent session on open
  useEffect(() => {
    if (!isOpen || !courseId) return;

    let isMounted = true;
    const initSession = async () => {
      setIsInitializing(true);
      setError(null);
      try {
        const session = await aiApi.getOrCreateSession({
          session_type: 'lesson_tutoring',
          course_id: courseId,
          topic_id: topicId,
          lesson_id: lessonId,
          title: `Tutoring: ${lessonTitle}`,
        });

        if (!isMounted) return;
        setSessionId(session.id);

        const history = await aiApi.getSessionMessages(session.id);
        if (isMounted) {
          setMessages(history);
        }
      } catch (err: any) {
        console.error('Session init error:', err);
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
  }, [isOpen, courseId, topicId, lessonId, lessonTitle]);

  if (!isOpen) return null;

  const toggleAttachment = (id: string) => {
    setSelectedAttachmentIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const getSelectedAttachmentsPayload = (): AIAttachmentItem[] => {
    return resources
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
        // Send to persistent session endpoint (AGY CLI agent)
        const agentMsg = await aiApi.sendSessionMessage(sessionId, {
          content: text,
          mode,
          attachments: attachedPayload,
        });
        setMessages((prev) => [...prev, agentMsg]);
      } else {
        // Fallback to legacy simplify-lesson endpoint
        const fallbackRes = await aiApi.simplifyLesson({
          lessonId,
          lessonTitle,
          topicTitle,
          courseTitle,
          lessonContent,
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
      console.error('Send message error:', err);
      setError(err?.message || 'Could not complete message exchange with AGY agent.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickAction = (mode: 'simplify' | 'analogy' | 'example' | 'diagram') => {
    if (mode === 'simplify') {
      handleSendMessage(`Please simplify the core concepts in "${lessonTitle}" into plain, intuitive language.`, 'simplify');
    } else if (mode === 'diagram') {
      handleSendMessage(`Generate a visual architecture diagram (Mermaid.js flowchart or sequence diagram) explaining the flow and invariants of "${lessonTitle}".`, 'diagram');
    } else if (mode === 'analogy') {
      handleSendMessage(`Can you give me a memorable real-world analogy to understand "${lessonTitle}"?`, 'analogy');
    } else if (mode === 'example') {
      handleSendMessage(`Show me a concrete step-by-step worked code example demonstrating "${lessonTitle}".`, 'example');
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 overflow-hidden bg-transparent pointer-events-none flex justify-end"
      role="dialog"
      aria-modal="true"
      aria-label="AI Lesson Helper"
    >
      {/* Invisible non-blocking click-away layer (no black overlay or dark tint) */}
      <div
        className="absolute inset-0 bg-transparent pointer-events-auto"
        onClick={onClose}
        aria-hidden="true"
      />

      <div className="pointer-events-auto relative w-full max-w-lg bg-white dark:bg-[#181C24] h-full shadow-2xl flex flex-col border-l border-[#D9DEE7] dark:border-[#2D3545] animate-in slide-in-from-right duration-200">
        {/* Panel Header */}
        <div className="p-4 sm:p-5 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between shrink-0 bg-gray-50/50 dark:bg-[#1C212B]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-gray-900 dark:text-white leading-tight">
                  AGY Academic Agent
                </h3>
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                  Persistent
                </span>
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 truncate max-w-[240px]">
                {lessonTitle} • {courseTitle}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            {onOpenFullStudio && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenFullStudio();
                }}
                className="p-1.5 text-gray-500 hover:text-indigo-600 dark:text-gray-400 dark:hover:text-indigo-400 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition cursor-pointer"
                title="Expand to Full-Page Simplification Studio"
                aria-label="Expand to Full Simplification Studio"
              >
                <Maximize2 className="w-4 h-4" />
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 cursor-pointer"
              aria-label="Close AI helper"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Instant Action Chips Bar */}
        <div className="px-4 py-2.5 bg-gray-50/70 dark:bg-[#151921] border-b border-gray-200 dark:border-gray-800 shrink-0">
          <div className="flex items-center gap-2 overflow-x-auto pb-1">
            <span className="text-[11px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider shrink-0">
              Actions:
            </span>
            <button
              type="button"
              onClick={() => handleQuickAction('simplify')}
              disabled={isLoading || isInitializing}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-[#1C212B] text-xs font-semibold text-gray-700 dark:text-gray-300 hover:border-indigo-500 dark:hover:border-indigo-400 hover:text-indigo-600 transition shrink-0 cursor-pointer"
            >
              <BookOpen className="w-3.5 h-3.5 text-indigo-500" />
              <span>Simplify</span>
            </button>
            <button
              type="button"
              onClick={() => handleQuickAction('diagram')}
              disabled={isLoading || isInitializing}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-[#1C212B] text-xs font-semibold text-gray-700 dark:text-gray-300 hover:border-purple-500 dark:hover:border-purple-400 hover:text-purple-600 transition shrink-0 cursor-pointer"
            >
              <Eye className="w-3.5 h-3.5 text-purple-500" />
              <span>Visual Diagram</span>
            </button>
            <button
              type="button"
              onClick={() => handleQuickAction('analogy')}
              disabled={isLoading || isInitializing}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-[#1C212B] text-xs font-semibold text-gray-700 dark:text-gray-300 hover:border-amber-500 dark:hover:border-amber-400 hover:text-amber-600 transition shrink-0 cursor-pointer"
            >
              <Lightbulb className="w-3.5 h-3.5 text-amber-500" />
              <span>Analogy</span>
            </button>
            <button
              type="button"
              onClick={() => handleQuickAction('example')}
              disabled={isLoading || isInitializing}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-[#1C212B] text-xs font-semibold text-gray-700 dark:text-gray-300 hover:border-emerald-500 dark:hover:border-emerald-400 hover:text-emerald-600 transition shrink-0 cursor-pointer"
            >
              <Code2 className="w-3.5 h-3.5 text-emerald-500" />
              <span>Worked Example</span>
            </button>
          </div>
        </div>

        {/* Scrollable Conversation History */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
          {isInitializing && (
            <div className="p-8 text-center space-y-3">
              <div className="w-7 h-7 mx-auto border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Restoring persistent session with AGY agent...
              </p>
            </div>
          )}

          {error && (
            <div className="p-3.5 rounded-xl border border-rose-200 dark:border-rose-800 bg-rose-50 dark:bg-rose-950/30 text-rose-800 dark:text-rose-200 text-xs flex items-start gap-2">
              <HelpCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="font-semibold">{error}</p>
              </div>
            </div>
          )}

          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex gap-3 ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              {msg.sender !== 'user' && (
                <div className="w-7 h-7 rounded-lg bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0 mt-0.5">
                  <Bot className="w-4 h-4" />
                </div>
              )}

              <div
                className={`max-w-[85%] rounded-2xl p-3.5 text-xs sm:text-sm leading-relaxed ${
                  msg.sender === 'user'
                    ? 'bg-indigo-600 text-white rounded-tr-xs'
                    : 'bg-gray-50 dark:bg-[#1C212B] border border-gray-200 dark:border-gray-800 text-gray-800 dark:text-gray-200 rounded-tl-xs'
                }`}
              >
                {/* Render attachments badge if message has attachments */}
                {msg.attachments && msg.attachments.length > 0 && (
                  <div className="mb-2 flex flex-wrap gap-1">
                    {msg.attachments.map((att: any, i: number) => (
                      <span
                        key={i}
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold ${
                          msg.sender === 'user'
                            ? 'bg-indigo-700/80 text-indigo-100'
                            : 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800'
                        }`}
                      >
                        <Paperclip className="w-3 h-3" />
                        <span>{att.title || 'Attached Resource'}</span>
                      </span>
                    ))}
                  </div>
                )}

                {msg.sender === 'user' ? (
                  <div className="whitespace-pre-wrap font-sans">{msg.content}</div>
                ) : (
                  <RichMarkdownRenderer content={msg.content} />
                )}

                {/* Footer metadata */}
                <div
                  className={`mt-1.5 flex items-center gap-1.5 text-[10px] ${
                    msg.sender === 'user' ? 'text-indigo-200 justify-end' : 'text-gray-400 justify-start'
                  }`}
                >
                  <Clock className="w-3 h-3" />
                  <span>
                    {msg.created_at
                      ? new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                      : 'Just now'}
                  </span>
                  {msg.raw_metadata?.source && (
                    <span className="ml-1 opacity-75">
                      • {msg.raw_metadata.source === 'agy_cli' ? 'AGY Terminal' : 'Curriculum Grounded'}
                    </span>
                  )}
                </div>
              </div>

              {msg.sender === 'user' && (
                <div className="w-7 h-7 rounded-lg bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300 flex items-center justify-center shrink-0 mt-0.5">
                  <UserIcon className="w-4 h-4" />
                </div>
              )}
            </div>
          ))}

          {isLoading && (
            <div className="flex gap-3 justify-start">
              <div className="w-7 h-7 rounded-lg bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
                <Bot className="w-4 h-4 animate-pulse" />
              </div>
              <div className="p-3.5 rounded-2xl bg-gray-50 dark:bg-[#1C212B] border border-gray-200 dark:border-gray-800 text-xs text-gray-500 flex items-center gap-2">
                <div className="w-3 h-3 rounded-full border-2 border-indigo-600 border-t-transparent animate-spin" />
                <span>AGY agent is thinking...</span>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Attachments Selection Tray */}
        {resources.length > 0 && (
          <div className="border-t border-gray-200 dark:border-gray-800 bg-gray-50/50 dark:bg-[#151921] px-4 py-2 shrink-0">
            <button
              type="button"
              onClick={() => setIsAttachmentsTrayOpen((prev) => !prev)}
              className="w-full flex items-center justify-between text-xs font-semibold text-gray-600 dark:text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition cursor-pointer"
            >
              <div className="flex items-center gap-1.5">
                <Paperclip className="w-3.5 h-3.5" />
                <span>Lesson Resources Attachments ({selectedAttachmentIds.length} attached)</span>
              </div>
              {isAttachmentsTrayOpen ? (
                <ChevronUp className="w-4 h-4" />
              ) : (
                <ChevronDown className="w-4 h-4" />
              )}
            </button>

            {isAttachmentsTrayOpen && (
              <div className="mt-2 space-y-1.5 max-h-32 overflow-y-auto pt-1">
                {resources.map((res) => {
                  const isChecked = selectedAttachmentIds.includes(res.id);
                  return (
                    <label
                      key={res.id}
                      className={`flex items-center justify-between p-2 rounded-lg border text-xs cursor-pointer transition ${
                        isChecked
                          ? 'border-indigo-500 bg-indigo-50/50 dark:bg-indigo-950/30 text-indigo-900 dark:text-indigo-200'
                          : 'border-gray-200 dark:border-gray-800 hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300'
                      }`}
                    >
                      <div className="flex items-center gap-2 truncate pr-2">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => toggleAttachment(res.id)}
                          className="rounded text-indigo-600 focus:ring-indigo-500 h-3.5 w-3.5"
                        />
                        <span className="font-medium truncate">{res.title}</span>
                      </div>
                      <span className="text-[10px] uppercase font-bold text-gray-400 dark:text-gray-500 shrink-0">
                        {res.type}
                      </span>
                    </label>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Chat Input Bar */}
        <div className="p-4 border-t border-gray-200 dark:border-gray-800 bg-white dark:bg-[#181C24] shrink-0">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage(customPrompt, 'custom');
            }}
            className="space-y-2"
          >
            <div className="relative">
              <input
                type="text"
                value={customPrompt}
                onChange={(e) => setCustomPrompt(e.target.value)}
                placeholder="Ask AGY agent about this lesson or attached files..."
                disabled={isLoading || isInitializing}
                className="w-full pl-3.5 pr-11 py-2.5 rounded-xl border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-xs sm:text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              <button
                type="submit"
                disabled={!customPrompt.trim() || isLoading || isInitializing}
                className={`absolute right-1.5 top-1.5 p-1.5 rounded-lg transition ${
                  customPrompt.trim() && !isLoading
                    ? 'bg-indigo-600 text-white hover:bg-indigo-700 cursor-pointer'
                    : 'text-gray-300 dark:text-gray-600 cursor-not-allowed'
                }`}
                aria-label="Send message to AGY agent"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
            <div className="flex items-center justify-between text-[11px] text-gray-400 dark:text-gray-500 px-1">
              <span>Persistent session grounded in master syllabus</span>
              {selectedAttachmentIds.length > 0 && (
                <span className="text-indigo-600 dark:text-indigo-400 font-semibold">
                  {selectedAttachmentIds.length} resource(s) attached
                </span>
              )}
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
