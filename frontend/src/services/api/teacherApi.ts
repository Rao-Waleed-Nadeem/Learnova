/**
 * Teacher Portal API Client (SSD-07, SSD-08, FR-CRS-01 - FR-CRS-05, FR-QBK-01 - FR-QBK-08, FR-ASM-01 - FR-ASM-09).
 * Communicates with backend endpoints (/api/v1/courses, /api/v1/topics, /api/v1/lessons, /api/v1/resources, /api/v1/questions, /api/v1/assessments).
 */

import { authApi } from './authApi';
import {
  BackendCourseResponse,
  BackendTopicResponse,
  BackendLessonResponse,
  BackendResourceResponse,
  mapBackendCourseToCourse,
} from './coursesApi';
import { Course, Topic, Lesson, LearningResource, QuestionData, Assessment } from '../../types';

export interface CreateCoursePayload {
  title: string;
  description?: string;
}

export interface UpdateCoursePayload {
  title?: string;
  description?: string;
}

export interface CreateTopicPayload {
  title: string;
  description?: string;
  order: number;
  mastery_threshold?: number;
}

export interface UpdateTopicPayload {
  title?: string;
  description?: string;
  order?: number;
  mastery_threshold?: number;
}

export interface CreateLessonPayload {
  title: string;
  description?: string;
  order: number;
}

export interface UpdateLessonPayload {
  title?: string;
  description?: string;
  order?: number;
}

export interface CreateResourcePayload {
  title: string;
  type: 'document' | 'video' | 'markdown' | 'code' | 'link';
  content_or_url: string;
  file_size_bytes?: number;
}

export interface UpdateResourcePayload {
  title?: string;
  type?: 'document' | 'video' | 'markdown' | 'code' | 'link';
  content_or_url?: string;
  file_size_bytes?: number;
}

export interface CreateQuestionPayload {
  course_id: string;
  topic_id: string;
  type: 'multiple_choice' | 'true_false' | 'fill_blank' | 'matching' | 'short_answer';
  difficulty?: 'easy' | 'medium' | 'hard';
  points?: number;
  prompt: string;
  explanation?: string;
  options?: Array<{ id?: string; text: string; is_correct: boolean }>;
  correct_bool?: boolean;
  accepted_answers?: string[];
  matching_pairs?: Array<{ id?: string; left: string; right: string }>;
  expected_rubric?: string;
}

export interface UpdateQuestionPayload {
  prompt?: string;
  explanation?: string;
  difficulty?: 'easy' | 'medium' | 'hard';
  points?: number;
  status?: 'draft' | 'pending_review' | 'approved' | 'rejected' | 'archived';
  options?: Array<{ id?: string; text: string; is_correct: boolean }>;
  correct_bool?: boolean;
  accepted_answers?: string[];
  matching_pairs?: Array<{ id?: string; left: string; right: string }>;
  expected_rubric?: string;
}

export interface CreateAssessmentPayload {
  course_id: string;
  topic_id?: string;
  title: string;
  type: 'diagnostic' | 'formative' | 'summative' | 'adaptive' | 'final';
  instructions?: string;
  time_limit_minutes?: number;
  passing_score_percent?: number;
  questions?: Array<{ question_id: string; order?: number; points?: number }>;
}

export interface UpdateAssessmentPayload {
  title?: string;
  instructions?: string;
  time_limit_minutes?: number;
  passing_score_percent?: number;
  questions?: Array<{ question_id: string; order?: number; points?: number }>;
}

class TeacherApiClient {
  // Course Lifecycle
  public async createCourse(payload: CreateCoursePayload): Promise<BackendCourseResponse> {
    return authApi.request<BackendCourseResponse>('/courses', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  public async updateCourse(courseId: string, payload: UpdateCoursePayload): Promise<BackendCourseResponse> {
    return authApi.request<BackendCourseResponse>(`/courses/${courseId}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
  }

  public async publishCourse(courseId: string): Promise<BackendCourseResponse> {
    return authApi.request<BackendCourseResponse>(`/courses/${courseId}/publish`, {
      method: 'POST',
    });
  }

  // Topic Hierarchy & Prerequisite DAG
  public async createTopic(courseId: string, payload: CreateTopicPayload): Promise<BackendTopicResponse> {
    return authApi.request<BackendTopicResponse>(`/courses/${courseId}/topics`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  public async updateTopic(topicId: string, payload: UpdateTopicPayload): Promise<BackendTopicResponse> {
    return authApi.request<BackendTopicResponse>(`/topics/${topicId}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
  }

  public async deleteTopic(topicId: string): Promise<void> {
    await authApi.request<void>(`/topics/${topicId}`, {
      method: 'DELETE',
    });
  }

  public async updateTopicPrerequisites(
    topicId: string,
    prerequisiteTopicIds: string[]
  ): Promise<{ topic_id: string; prerequisite_topic_ids: string[] }> {
    return authApi.request<{ topic_id: string; prerequisite_topic_ids: string[] }>(
      `/topics/${topicId}/prerequisites`,
      {
        method: 'PUT',
        body: JSON.stringify({ prerequisite_topic_ids: prerequisiteTopicIds }),
      }
    );
  }

  // Lesson CRUD
  public async createLesson(topicId: string, payload: CreateLessonPayload): Promise<BackendLessonResponse> {
    return authApi.request<BackendLessonResponse>(`/topics/${topicId}/lessons`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  public async updateLesson(lessonId: string, payload: UpdateLessonPayload): Promise<BackendLessonResponse> {
    return authApi.request<BackendLessonResponse>(`/lessons/${lessonId}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
  }

  public async deleteLesson(lessonId: string): Promise<void> {
    await authApi.request<void>(`/lessons/${lessonId}`, {
      method: 'DELETE',
    });
  }

  // Learning Resource CRUD
  public async createResource(lessonId: string, payload: CreateResourcePayload): Promise<BackendResourceResponse> {
    return authApi.request<BackendResourceResponse>(`/lessons/${lessonId}/resources`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  public async updateResource(resourceId: string, payload: UpdateResourcePayload): Promise<BackendResourceResponse> {
    return authApi.request<BackendResourceResponse>(`/resources/${resourceId}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
  }

  public async deleteResource(resourceId: string): Promise<void> {
    await authApi.request<void>(`/resources/${resourceId}`, {
      method: 'DELETE',
    });
  }

  // Question Bank
  public async listQuestions(courseId: string, topicId?: string, status?: string): Promise<any[]> {
    let url = `/questions?course_id=${courseId}`;
    if (topicId) url += `&topic_id=${topicId}`;
    if (status) url += `&status=${status}`;
    return authApi.request<any[]>(url, {
      method: 'GET',
    });
  }

  public async createQuestion(payload: CreateQuestionPayload): Promise<any> {
    return authApi.request<any>('/questions', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  public async updateQuestion(questionId: string, payload: UpdateQuestionPayload): Promise<any> {
    return authApi.request<any>(`/questions/${questionId}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
  }

  public async archiveQuestion(questionId: string): Promise<any> {
    return authApi.request<any>(`/questions/${questionId}/archive`, {
      method: 'POST',
    });
  }

  // Assessment Authoring
  public async listAssessments(courseId: string, topicId?: string, status?: string): Promise<any[]> {
    let url = `/assessments?course_id=${courseId}`;
    if (topicId) url += `&topic_id=${topicId}`;
    if (status) url += `&status=${status}`;
    return authApi.request<any[]>(url, {
      method: 'GET',
    });
  }

  public async createAssessment(payload: CreateAssessmentPayload): Promise<any> {
    return authApi.request<any>('/assessments', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  public async updateAssessment(assessmentId: string, payload: UpdateAssessmentPayload): Promise<any> {
    return authApi.request<any>(`/assessments/${assessmentId}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
  }

  public async publishAssessment(assessmentId: string): Promise<any> {
    return authApi.request<any>(`/assessments/${assessmentId}/publish`, {
      method: 'POST',
    });
  }
}

export function mapBackendQuestionToQuestionData(b: any): QuestionData {
  return {
    id: b.id,
    courseId: b.course_id,
    topicId: b.topic_id,
    type: b.type,
    prompt: b.prompt,
    difficulty: b.difficulty,
    points: b.points,
    explanation: b.explanation || undefined,
    status: b.status,
    source: b.source,
    options: b.options
      ? b.options.map((opt: any) => ({
          id: opt.id || String(Math.random()),
          text: opt.text,
          isCorrect: !!opt.is_correct,
        }))
      : undefined,
    isMultipleCorrectAllowed: b.is_multiple_correct_allowed ?? undefined,
    correctBool: b.correct_bool ?? undefined,
    acceptedAnswers: b.accepted_answers ?? undefined,
    caseSensitive: b.case_sensitive ?? undefined,
    matchingPairs: b.matching_pairs
      ? b.matching_pairs.map((p: any) => ({
          id: p.id || String(Math.random()),
          left: p.left,
          right: p.right,
        }))
      : undefined,
    expectedRubric: b.expected_rubric ?? undefined,
    createdAt: b.created_at || new Date().toISOString(),
    updatedAt: b.updated_at || new Date().toISOString(),
  };
}

export function mapBackendAssessmentToAssessment(b: any): Assessment {
  return {
    id: b.id,
    courseId: b.course_id,
    topicId: b.topic_id || '',
    title: b.title,
    type: b.type,
    instructions: b.instructions || '',
    questionIds: (b.questions || []).map((q: any) => q.question_id || q.id),
    timeLimitMinutes: b.time_limit_minutes || undefined,
    maxAttempts: b.max_attempts || undefined,
    passingScorePercent: b.passing_score_percent || undefined,
    scheduleDate: b.schedule_date || undefined,
    status: b.status,
    createdAt: b.created_at || new Date().toISOString(),
    updatedAt: b.updated_at || new Date().toISOString(),
  };
}

export const teacherApi = new TeacherApiClient();
