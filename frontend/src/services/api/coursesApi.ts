/**
 * Courses and Enrollments API Client (SSD-01, FR-CRS-01, FR-CRS-02, FR-CRS-05).
 * Communicates with backend endpoints (/api/v1/courses/*, /api/v1/students/me/enrollments).
 */

import { authApi } from './authApi';
import { Course, Topic, Lesson, LearningResource, Enrollment } from '../../types';

export interface BackendCourseResponse {
  id: string;
  title: string;
  description?: string | null;
  status: 'draft' | 'published' | 'archived';
  creator_id?: string | null;
  creator_name?: string | null;
  topics_count?: number;
  lessons_count?: number;
  created_at: string;
  updated_at: string;
}

export interface BackendResourceResponse {
  id: string;
  lesson_id: string;
  course_id?: string | null;
  title: string;
  type: 'document' | 'video' | 'markdown' | 'code' | 'link';
  content_or_url: string;
  file_size_bytes?: number | null;
  created_at: string;
  updated_at: string;
}

export interface BackendLessonResponse {
  id: string;
  topic_id: string;
  course_id?: string | null;
  title: string;
  description?: string | null;
  order: number;
  resources?: BackendResourceResponse[];
  created_at: string;
  updated_at: string;
}

export interface BackendTopicResponse {
  id: string;
  course_id: string;
  title: string;
  description?: string | null;
  order: number;
  mastery_threshold: number | string;
  prerequisite_topic_ids?: string[];
  lessons?: BackendLessonResponse[];
  created_at: string;
  updated_at: string;
}

export interface BackendCourseDetailResponse extends BackendCourseResponse {
  topics: BackendTopicResponse[];
}

export interface BackendEnrollmentResponse {
  id: string;
  student_id: string;
  course_id: string;
  course_title?: string | null;
  status: 'active' | 'completed' | 'dropped';
  enrolled_at: string;
  completed_at?: string | null;
  progress_percent: number;
  completed_lessons_count?: number;
  total_lessons_count?: number;
  created_at: string;
  updated_at: string;
}

export function mapBackendCourseToCourse(c: BackendCourseResponse): Course {
  return {
    id: c.id,
    title: c.title,
    description: c.description || '',
    status: c.status,
    createdAt: c.created_at,
    updatedAt: c.updated_at,
    creatorId: c.creator_id || undefined,
    creatorName: c.creator_name || undefined,
  };
}

export function mapBackendEnrollmentToEnrollment(e: BackendEnrollmentResponse): Enrollment {
  return {
    id: e.id,
    studentId: e.student_id,
    courseId: e.course_id,
    status: e.status === 'completed' ? 'completed' : 'active',
    enrolledAt: e.enrolled_at,
    completedAt: e.completed_at || undefined,
    progressPercent: Math.round(e.progress_percent || 0),
  };
}

export function mapBackendCourseDetailToCurriculum(detail: BackendCourseDetailResponse): {
  course: Course;
  topics: Topic[];
  lessons: Lesson[];
  resources: LearningResource[];
} {
  const course = mapBackendCourseToCourse(detail);
  const topics: Topic[] = [];
  const lessons: Lesson[] = [];
  const resources: LearningResource[] = [];

  for (const t of detail.topics || []) {
    topics.push({
      id: t.id,
      courseId: t.course_id || detail.id,
      title: t.title,
      description: t.description || '',
      order: t.order,
      masteryThreshold: Number(t.mastery_threshold) || 75,
      prerequisiteTopicIds: t.prerequisite_topic_ids || [],
      createdAt: t.created_at,
      updatedAt: t.updated_at,
    });

    for (const l of t.lessons || []) {
      lessons.push({
        id: l.id,
        topicId: l.topic_id || t.id,
        courseId: l.course_id || detail.id,
        title: l.title,
        description: l.description || '',
        order: l.order,
        createdAt: l.created_at,
        updatedAt: l.updated_at,
      });

      for (const r of l.resources || []) {
        resources.push({
          id: r.id,
          lessonId: r.lesson_id || l.id,
          courseId: r.course_id || detail.id,
          title: r.title,
          type: r.type,
          contentOrUrl: r.content_or_url,
          fileSize: r.file_size_bytes ? `${Math.round(r.file_size_bytes / 1024)} KB` : undefined,
          createdAt: r.created_at,
          updatedAt: r.updated_at,
        });
      }
    }
  }

  return { course, topics, lessons, resources };
}

class CoursesApiClient {
  /**
   * List courses from public catalog.
   */
  public async listCourses(skip = 0, limit = 50): Promise<BackendCourseResponse[]> {
    return authApi.request<BackendCourseResponse[]>(`/courses?skip=${skip}&limit=${limit}`, {
      method: 'GET',
    });
  }

  /**
   * Retrieve full course details including syllabus, topics, lessons, and resources.
   */
  public async getCourseDetail(courseId: string): Promise<BackendCourseDetailResponse> {
    return authApi.request<BackendCourseDetailResponse>(`/courses/${courseId}`, {
      method: 'GET',
    });
  }

  /**
   * Enroll authenticated student into a published course.
   */
  public async enrollCourse(courseId: string): Promise<BackendEnrollmentResponse> {
    return authApi.request<BackendEnrollmentResponse>(`/courses/${courseId}/enrollments`, {
      method: 'POST',
    });
  }

  /**
   * Retrieve all course enrollments for the currently authenticated student.
   */
  public async getMyEnrollments(): Promise<BackendEnrollmentResponse[]> {
    return authApi.request<BackendEnrollmentResponse[]>('/students/me/enrollments', {
      method: 'GET',
    });
  }
}

export const coursesApi = new CoursesApiClient();
