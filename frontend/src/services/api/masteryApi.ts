/**
 * Mastery and Knowledge Tracing API Client (FR-MAS-01 - FR-MAS-08, SSD-02).
 * Communicates with backend endpoints (/api/v1/courses/{id}/mastery).
 */

import { authApi } from './authApi';
import { MasteryState } from '../../types';

export interface BackendTopicMasteryItem {
  topic_id: string;
  topic_title: string;
  course_id: string;
  mastery_score: number;
  score_percent: number;
  status: 'not_assessed' | 'developing' | 'competent' | 'mastered';
  bkt_probability?: number | null;
  attempts_count: number;
  last_assessed_at?: string | null;
}

export interface BackendCourseMasteryResponse {
  course_id: string;
  student_id: string;
  topics: BackendTopicMasteryItem[];
  overall_mastery_percent: number;
  mastered_count: number;
  competent_count: number;
  developing_count: number;
  not_assessed_count: number;
}

export function mapBackendMasteryToMasteryState(item: BackendTopicMasteryItem): MasteryState {
  return {
    id: `ms-${item.topic_id}`,
    studentId: item.course_id, // fallback
    courseId: item.course_id,
    topicId: item.topic_id,
    scorePercent: item.score_percent,
    status: item.status,
    lastAssessedAt: item.last_assessed_at || undefined,
  };
}

class MasteryApiClient {
  /**
   * Retrieve authoritative topic mastery matrix for an actively enrolled course.
   */
  public async getCourseMastery(courseId: string, studentId?: string): Promise<BackendCourseMasteryResponse> {
    const query = studentId ? `?student_id=${studentId}` : '';
    return authApi.request<BackendCourseMasteryResponse>(`/courses/${courseId}/mastery${query}`, {
      method: 'GET',
    });
  }
}

export const masteryApi = new MasteryApiClient();
