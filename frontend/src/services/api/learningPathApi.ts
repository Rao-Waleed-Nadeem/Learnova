/**
 * Learning Map and Topic Readiness API Client (SSD-02, SSD-03, FR-CRS-05, FR-MAS-05).
 * Communicates with backend endpoints (/api/v1/courses/{id}/learning-map, /api/v1/courses/{id}/learning-path, /api/v1/topics/{id}/readiness).
 */

import { authApi } from './authApi';

export interface LearningMapNode {
  id: string;
  title: string;
  description?: string | null;
  order: number;
  mastery_threshold: number;
  prerequisite_ids: string[];
  lessons_count: number;
  completed_lessons_count: number;
  readiness: 'ready' | 'locked' | 'in_progress' | 'not_evaluated';
  unmet_prerequisites: string[];
}

export interface LearningMapEdge {
  source: string;
  target: string;
}

export interface LearningMapResponse {
  course_id: string;
  course_title: string;
  nodes: LearningMapNode[];
  edges: LearningMapEdge[];
}

export interface LearningPathItemResponse {
  id: string;
  course_id: string;
  topic_id: string;
  topic_title: string;
  lesson_id?: string | null;
  lesson_title?: string | null;
  type: 'lesson' | 'diagnostic' | 'adaptive_practice' | 'final_exam' | 'course_completed';
  title: string;
  reason: string;
  is_completed: boolean;
}

export interface CourseLearningPathResponse {
  course_id: string;
  student_id: string;
  recommended_next_step: LearningPathItemResponse;
  items: LearningPathItemResponse[];
  total_topics: number;
  mastered_topics: number;
  progress_percent: number;
}

export interface TopicPrerequisiteStatus {
  prerequisite_topic_id: string;
  prerequisite_title: string;
  required_mastery: number;
  current_mastery: number;
  status: string;
  is_satisfied: boolean;
}

export interface TopicReadinessResponse {
  topic_id: string;
  topic_title: string;
  is_ready: boolean;
  unmet_prerequisites: TopicPrerequisiteStatus[];
  diagnostic_assessment_id?: string | null;
  reason: string;
}

class LearningPathApiClient {
  /**
   * Retrieve authoritative course learning map with prerequisite DAG edges and student readiness.
   */
  public async getLearningMap(courseId: string): Promise<LearningMapResponse> {
    return authApi.request<LearningMapResponse>(`/courses/${courseId}/learning-map`, {
      method: 'GET',
    });
  }

  /**
   * Retrieve personalized learning path with immediate next recommended step.
   */
  public async getLearningPath(courseId: string): Promise<CourseLearningPathResponse> {
    return authApi.request<CourseLearningPathResponse>(`/courses/${courseId}/learning-path`, {
      method: 'GET',
    });
  }

  /**
   * Retrieve server-authoritative readiness evaluation for a specific topic.
   */
  public async getTopicReadiness(topicId: string, studentId?: string): Promise<TopicReadinessResponse> {
    const query = studentId ? `?student_id=${studentId}` : '';
    return authApi.request<TopicReadinessResponse>(`/topics/${topicId}/readiness${query}`, {
      method: 'GET',
    });
  }
}

export const learningPathApi = new LearningPathApiClient();
