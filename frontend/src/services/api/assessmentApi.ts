/**
 * Assessment and Server-Authoritative Grading API Client (SSD-04, FR-ASM-01 - FR-ASM-09).
 * Communicates with backend endpoints (/api/v1/assessments/*, /api/v1/attempts/*).
 */

import { authApi } from './authApi';
import { StudentAssessmentResult, QuestionData } from '../../types';

export interface BackendAttemptResponseItem {
  id: string;
  attempt_id: string;
  question_id: string;
  question_version: number;
  student_response: any;
  is_correct?: boolean | null;
  points_awarded?: number | null;
  points_possible: number;
  response_time_seconds?: number | null;
  feedback?: string | null;
  created_at: string;
  updated_at: string;
}

export interface BackendAssessmentAttemptResponse {
  id: string;
  assessment_id: string;
  student_id: string;
  enrollment_id: string;
  attempt_number: number;
  status: 'in_progress' | 'submitted' | 'expired';
  started_at: string;
  deadline_at?: string | null;
  current_difficulty?: 'easy' | 'medium' | 'hard' | null;
  max_score: number;
  questions: Array<Record<string, any>>;
  responses: BackendAttemptResponseItem[];
  created_at: string;
}

export interface BackendAssessmentResultResponse {
  id: string;
  assessment_id: string;
  student_id: string;
  enrollment_id: string;
  attempt_number: number;
  status: 'in_progress' | 'submitted' | 'expired';
  started_at: string;
  submitted_at?: string | null;
  completed_at?: string | null;
  score?: number | null;
  max_score: number;
  score_percent?: number | null;
  passed?: boolean | null;
  responses: BackendAttemptResponseItem[];
  created_at: string;
}

export interface BackendAdaptiveNextQuestionResponse {
  attempt_id: string;
  current_difficulty: 'easy' | 'medium' | 'hard';
  question?: Record<string, any> | null;
}

class AssessmentApiClient {
  /**
   * List assessments for a course.
   */
  public async listAssessments(courseId: string, topicId?: string, type?: string): Promise<any[]> {
    let url = `/assessments?course_id=${courseId}`;
    if (topicId) url += `&topic_id=${topicId}`;
    if (type) url += `&type=${type}`;
    return authApi.request<any[]>(url, {
      method: 'GET',
    });
  }

  /**
   * Start a new assessment attempt for an enrolled student.
   */
  public async startAttempt(
    assessmentId: string,
    initialDifficulty?: 'easy' | 'medium' | 'hard'
  ): Promise<BackendAssessmentAttemptResponse> {
    return authApi.request<BackendAssessmentAttemptResponse>(`/assessments/${assessmentId}/attempts`, {
      method: 'POST',
      body: JSON.stringify({
        initial_difficulty: initialDifficulty,
      }),
    });
  }

  /**
   * Retrieve active attempt details and secure questions projection.
   */
  public async getAttempt(attemptId: string): Promise<BackendAssessmentAttemptResponse> {
    return authApi.request<BackendAssessmentAttemptResponse>(`/attempts/${attemptId}`, {
      method: 'GET',
    });
  }

  /**
   * Idempotently record an interim answer for a question during an attempt.
   */
  public async recordResponse(
    attemptId: string,
    questionId: string,
    response: any,
    responseTimeSeconds?: number
  ): Promise<BackendAttemptResponseItem> {
    return authApi.request<BackendAttemptResponseItem>(`/attempts/${attemptId}/responses/${questionId}`, {
      method: 'PUT',
      body: JSON.stringify({
        student_response: response,
        response_time_seconds: responseTimeSeconds || 0,
      }),
    });
  }

  /**
   * Request next adaptive practice question dynamically selected by the backend.
   */
  public async getNextAdaptiveQuestion(attemptId: string): Promise<BackendAdaptiveNextQuestionResponse> {
    return authApi.request<BackendAdaptiveNextQuestionResponse>(`/attempts/${attemptId}/next-question`, {
      method: 'POST',
    });
  }

  /**
   * Finalize and submit attempt for server-authoritative grading.
   */
  public async submitAttempt(attemptId: string): Promise<BackendAssessmentResultResponse> {
    return authApi.request<BackendAssessmentResultResponse>(`/attempts/${attemptId}/submit`, {
      method: 'POST',
    });
  }

  /**
   * Retrieve graded result, scores, and feedback for a finalized attempt.
   */
  public async getAttemptResult(attemptId: string): Promise<BackendAssessmentResultResponse> {
    return authApi.request<BackendAssessmentResultResponse>(`/attempts/${attemptId}/result`, {
      method: 'GET',
    });
  }
}

export const assessmentApi = new AssessmentApiClient();
