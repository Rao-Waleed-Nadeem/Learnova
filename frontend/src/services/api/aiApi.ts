/**
 * AI Service API client connecting frontend components to FastAPI backend (/api/v1/ai/*).
 */

import { authApi } from './authApi';

export interface AISimplifyLessonRequest {
  lessonTitle?: string;
  topicTitle?: string;
  courseTitle?: string;
  lessonContent?: string;
  mode: 'simplify' | 'analogy' | 'example' | 'custom';
  customPrompt?: string;
  lessonId?: string;
}

export interface AISimplifyLessonResponse {
  success: boolean;
  explanation: string;
  source: 'gemini' | 'gemini_cache' | 'academic_cache' | 'deterministic_fallback';
  is_cached?: boolean;
  prompt_used?: string;
}

export interface AIGenerateQuestionsRequest {
  course_id: string;
  topic_id: string;
  source_content?: string;
  question_types?: string[];
  difficulty?: 'easy' | 'medium' | 'hard';
  count?: number;
}

export interface AICandidateQuestionResponse {
  id: string;
  course_id: string;
  topic_id: string;
  author_id?: string | null;
  prompt: string;
  type: string;
  difficulty: 'easy' | 'medium' | 'hard';
  points: number;
  explanation?: string | null;
  source_context?: string | null;
  payload: Record<string, any>;
  answer_key: Record<string, any>;
  status: 'pending_review' | 'approved' | 'rejected';
  rejection_reason?: string | null;
  approved_question_id?: string | null;
  provider: string;
  model: string;
  created_at: string;
}

export interface AICandidateListResponse {
  items: AICandidateQuestionResponse[];
  total: number;
}

export interface AICandidateApproveResponse {
  success: boolean;
  candidate_id: string;
  approved_question_id: string;
  message: string;
}

export interface AICandidateRejectResponse {
  success: boolean;
  candidate_id: string;
  status: string;
  message: string;
}

class AIApiClient {
  private getHeaders(): HeadersInit {
    const token = authApi.getAccessToken();
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    return headers;
  }

  public async simplifyLesson(req: AISimplifyLessonRequest): Promise<AISimplifyLessonResponse> {
    const payload = {
      lesson_title: req.lessonTitle,
      topic_title: req.topicTitle,
      course_title: req.courseTitle,
      lesson_content: req.lessonContent,
      mode: req.mode,
      custom_prompt: req.customPrompt,
      lesson_id: req.lessonId || (req as any).lesson_id,
    };

    const res = await fetch('/api/v1/ai/simplify-lesson', {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      throw new Error(`AI simplification failed with status ${res.status}`);
    }

    return res.json();
  }

  public async generateQuestions(req: AIGenerateQuestionsRequest): Promise<AICandidateQuestionResponse[]> {
    const res = await fetch('/api/v1/ai/generate-questions', {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(req),
    });

    if (!res.ok) {
      throw new Error(`AI question generation failed with status ${res.status}`);
    }

    return res.json();
  }

  public async listCandidates(
    courseId: string,
    topicId?: string,
    status?: string
  ): Promise<AICandidateListResponse> {
    let url = `/api/v1/ai/candidates?course_id=${encodeURIComponent(courseId)}`;
    if (topicId) {
      url += `&topic_id=${encodeURIComponent(topicId)}`;
    }
    if (status) {
      url += `&status=${encodeURIComponent(status)}`;
    }

    const res = await fetch(url, {
      method: 'GET',
      headers: this.getHeaders(),
    });

    if (!res.ok) {
      throw new Error(`Failed to list candidate questions (${res.status})`);
    }

    return res.json();
  }

  public async approveCandidate(candidateId: string): Promise<AICandidateApproveResponse> {
    const res = await fetch(`/api/v1/ai/candidates/${candidateId}/approve`, {
      method: 'POST',
      headers: this.getHeaders(),
    });

    if (!res.ok) {
      throw new Error(`Failed to approve candidate question (${res.status})`);
    }

    return res.json();
  }

  public async rejectCandidate(candidateId: string, reason?: string): Promise<AICandidateRejectResponse> {
    const res = await fetch(`/api/v1/ai/candidates/${candidateId}/reject`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({ reason }),
    });

    if (!res.ok) {
      throw new Error(`Failed to reject candidate question (${res.status})`);
    }

    return res.json();
  }
}

export const aiApi = new AIApiClient();
