/**
 * Curriculum and Lesson Workspace API Client (SSD-01, SSD-03, FR-CRS-06).
 * Communicates with backend endpoints (/api/v1/lessons/*, /api/v1/resources/*).
 */

import { authApi } from './authApi';
import { LessonCompletion } from '../../types';

export interface BackendLessonCompletionResponse {
  id: string;
  enrollment_id: string;
  student_id: string;
  course_id: string;
  topic_id: string;
  lesson_id: string;
  completed_at: string;
  progress_percent?: number | null;
}

export interface ResourceActivityPayload {
  event_type: 'view' | 'read' | 'watch' | 'complete';
  duration_seconds?: number;
}

export interface BackendResourceActivityResponse {
  id: string;
  enrollment_id?: string | null;
  student_id: string;
  resource_id: string;
  event_type: string;
  duration_seconds: number;
  occurred_at: string;
  created_at: string;
}

export function mapBackendCompletionToCompletion(c: BackendLessonCompletionResponse): LessonCompletion {
  return {
    id: c.id,
    studentId: c.student_id,
    courseId: c.course_id,
    topicId: c.topic_id,
    lessonId: c.lesson_id,
    completedAt: c.completed_at,
  };
}

class CurriculumApiClient {
  /**
   * Idempotently mark a lesson as completed on the authoritative backend.
   */
  public async completeLesson(lessonId: string): Promise<BackendLessonCompletionResponse> {
    return authApi.request<BackendLessonCompletionResponse>(`/lessons/${lessonId}/complete`, {
      method: 'POST',
    });
  }

  /**
   * Record student study activity/interaction on a learning resource.
   */
  public async recordResourceActivity(
    resourceId: string,
    payload: ResourceActivityPayload
  ): Promise<BackendResourceActivityResponse> {
    return authApi.request<BackendResourceActivityResponse>(`/resources/${resourceId}/activity`, {
      method: 'POST',
      body: JSON.stringify({
        event_type: payload.event_type,
        duration_seconds: payload.duration_seconds || 0,
      }),
    });
  }
}

export const curriculumApi = new CurriculumApiClient();
