/**
 * Admin & Analytics API Client (Slice 9, ADM-01 - ADM-08, TEA-01 - TEA-04).
 * Communicates with backend endpoints (/api/v1/admin/* and /api/v1/teacher/*).
 */

import { authApi } from './authApi';
import { UserAccount, AuditEvent } from '../../types';
import { ServiceHealthCheck } from '../../utils/adminLogic';

export interface AdminDashboardResponse {
  users?: {
    total: number;
    students: number;
    teachers: number;
    administrators: number;
    active: number;
    inactive: number;
  };
  users_summary?: {
    total: number;
    students: number;
    teachers: number;
    administrators: number;
    active: number;
    deactivated: number;
  };
  curriculum?: {
    total_courses: number;
    published_courses: number;
    draft_courses: number;
    total_topics: number;
    total_lessons: number;
  };
  curriculum_summary?: {
    courses: number;
    published_courses: number;
    draft_courses: number;
    topics: number;
    lessons: number;
    resources?: number;
  };
  enrollments?: {
    total_enrollments: number;
    active_enrollments: number;
    completed_enrollments: number;
  };
  enrollment_summary?: {
    total: number;
    active: number;
    completed: number;
    dropped?: number;
  };
  assessments?: {
    total_assessments: number;
    total_attempts: number;
    completed_attempts: number;
  };
  assessment_summary?: {
    total_assessments: number;
    published_assessments?: number;
    total_attempts: number;
    completed_attempts: number;
  };
  security_audit?: {
    total_events_24h: number;
    blocked_events_24h: number;
    failure_events_24h: number;
  };
  security_summary?: {
    total_events_24h: number;
    failures_blocked_24h: number;
    unique_active_users_24h?: number;
  };
  generated_at?: string;
}

export interface SystemHealthResponse {
  status: 'healthy' | 'degraded' | 'critical';
  timestamp: string;
  database: {
    status: 'connected' | 'disconnected' | 'error';
    latency_ms: number;
  };
  alembic: {
    status: 'up_to_date' | 'behind' | 'error';
    current_revision?: string;
  };
  outbox: {
    pending_events: number;
    dead_letter_events: number;
    status: 'optimal' | 'backlogged';
  };
  ai: {
    status: 'operational' | 'disabled' | 'error';
    configured_provider: string;
  };
}

export interface AdminUserCourseSummary {
  id: string;
  title: string;
  status: string;
  relationship: 'creator' | 'instructor' | 'enrolled';
  enrolled_students_count?: number;
  topics_count?: number;
  enrollment_status?: string;
  progress_percent?: number;
  completed_lessons?: number;
  total_lessons?: number;
}

export interface AdminTeacherMetrics {
  authored_questions_count: number;
  created_assessments_count: number;
  published_courses_count: number;
  total_students_taught: number;
}

export interface AdminStudentMetrics {
  xp: number;
  level: number;
  completed_lessons_count: number;
  average_assessment_score?: number | null;
}

export interface AdminUserSecurityProfile {
  auth_method: string;
  account_status: string;
  role_scope: string;
  last_active_ip?: string | null;
  active_sessions_count: number;
  total_audit_events: number;
}

export interface AdminUserDetailResponse {
  user: {
    id: string;
    email: string;
    full_name: string;
    role: string;
    is_active: boolean;
    created_at: string;
    updated_at?: string;
    profile?: {
      department?: string | null;
      bio?: string | null;
      avatar_url?: string | null;
      preferences?: Record<string, any>;
    };
  };
  enrolled_courses_count: number;
  assigned_courses_count: number;
  completed_attempts_count: number;
  security_audit_events_count: number;
  last_active_at?: string | null;
  last_active_ip?: string | null;
  active_sessions_count: number;
  courses: AdminUserCourseSummary[];
  teacher_metrics?: AdminTeacherMetrics | null;
  student_metrics?: AdminStudentMetrics | null;
  security_profile?: AdminUserSecurityProfile | null;
}

export interface AdminUserListResponse {
  items: any[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

export interface AdminAuditLogListResponse {
  items: any[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

export interface TeacherDashboardResponse {
  teacher_id: string;
  teacher_name: string;
  total_assigned_courses: number;
  total_enrolled_students: number;
  assigned_courses: any[];
}

export interface BackendTopicMasteryDistributionItem {
  topic_id: string;
  topic_title: string;
  threshold: number;
  average_mastery_percent?: number | null;
  assessed_students_count: number;
  mastered_count: number;
  competent_count: number;
  developing_count: number;
  not_assessed_count: number;
  is_class_weak: boolean;
}

export interface BackendScoreDistributionBands {
  '0-49%'?: number;
  '50-69%'?: number;
  '70-84%'?: number;
  '85-100%'?: number;
  band_0_49?: number;
  band_50_69?: number;
  band_70_84?: number;
  band_85_100?: number;
}

export interface BackendAtRiskStudentItem {
  student_id: string;
  student_name: string;
  student_email: string;
  weak_topics_count: number;
  average_mastery_percent?: number | null;
}

export interface BackendAssessmentSummaryItem {
  assessment_id: string;
  title: string;
  type: string;
  total_attempts: number;
  completed_attempts: number;
  average_score_percent?: number | null;
  highest_score_percent?: number | null;
  lowest_score_percent?: number | null;
}

export interface TeacherCourseAnalyticsResponse {
  course_id: string;
  course_title: string;
  enrolled_students_count: number;
  overall_average_mastery?: number | null;
  topic_mastery_distribution: BackendTopicMasteryDistributionItem[];
  weak_concepts: BackendTopicMasteryDistributionItem[];
  score_distribution: BackendScoreDistributionBands;
  assessment_summaries: BackendAssessmentSummaryItem[];
  at_risk_students: BackendAtRiskStudentItem[];
}

class AdminApiClient {
  // ADM-01: Admin Dashboard
  public async getAdminDashboard(): Promise<AdminDashboardResponse> {
    return authApi.request<AdminDashboardResponse>('/admin/dashboard', {
      method: 'GET',
    });
  }

  // ADM-06: System Health & Diagnostics
  public async getSystemHealth(): Promise<SystemHealthResponse> {
    return authApi.request<SystemHealthResponse>('/admin/system/health', {
      method: 'GET',
    });
  }

  // ADM-02: User Directory
  public async listUsers(params?: {
    query?: string;
    search?: string;
    role?: string;
    is_active?: boolean;
    page?: number;
    page_size?: number;
    limit?: number;
    offset?: number;
  }): Promise<AdminUserListResponse> {
    const q = new URLSearchParams();
    const searchTerm = params?.search || params?.query;
    if (searchTerm) q.set('search', searchTerm);
    if (params?.role && params.role !== 'all') q.set('role', params.role);
    if (params?.is_active !== undefined) q.set('is_active', String(params.is_active));

    const limit = params?.limit || params?.page_size || 50;
    q.set('limit', String(limit));

    const offset = params?.offset !== undefined
      ? params.offset
      : params?.page
      ? (params.page - 1) * limit
      : 0;
    if (offset > 0) q.set('offset', String(offset));

    const qs = q.toString();
    const url = qs ? `/admin/users?${qs}` : '/admin/users';
    return authApi.request<AdminUserListResponse>(url, {
      method: 'GET',
    });
  }

  // ADM-03: User Details
  public async getUserDetail(userId: string): Promise<AdminUserDetailResponse> {
    return authApi.request<AdminUserDetailResponse>(`/admin/users/${userId}`, {
      method: 'GET',
    });
  }

  // ADM-04: Role Change
  public async changeUserRole(
    userId: string,
    role: 'administrator' | 'teacher' | 'student'
  ): Promise<any> {
    return authApi.request<any>(`/admin/users/${userId}/role`, {
      method: 'PUT',
      body: JSON.stringify({ role }),
    });
  }

  // ADM-02: User Status Toggle (Deactivation / Reactivation)
  public async toggleUserStatus(userId: string, isActive: boolean): Promise<any> {
    return authApi.request<any>(`/admin/users/${userId}/status`, {
      method: 'PUT',
      body: JSON.stringify({ is_active: isActive }),
    });
  }

  // ADM-05: Security Audit Log
  public async getAuditLogs(params?: {
    actor_id?: string;
    action?: string;
    outcome?: string;
    start_date?: string;
    end_date?: string;
    from_date?: string;
    to_date?: string;
    page?: number;
    page_size?: number;
    limit?: number;
    offset?: number;
  }): Promise<AdminAuditLogListResponse> {
    const q = new URLSearchParams();
    if (params?.actor_id) q.set('actor_id', params.actor_id);
    if (params?.action && params.action !== 'all') q.set('action', params.action);
    if (params?.outcome && params.outcome !== 'all') q.set('outcome', params.outcome);

    const fromDate = params?.from_date || params?.start_date;
    if (fromDate) q.set('from_date', fromDate);

    const toDate = params?.to_date || params?.end_date;
    if (toDate) q.set('to_date', toDate);

    const limit = params?.limit || params?.page_size || 50;
    q.set('limit', String(limit));

    const offset = params?.offset !== undefined
      ? params.offset
      : params?.page
      ? (params.page - 1) * limit
      : 0;
    if (offset > 0) q.set('offset', String(offset));

    const qs = q.toString();
    const url = qs ? `/admin/audit-logs?${qs}` : '/admin/audit-logs';
    return authApi.request<AdminAuditLogListResponse>(url, {
      method: 'GET',
    });
  }

  // Teacher Analytics & Dashboard
  public async getTeacherDashboard(): Promise<TeacherDashboardResponse> {
    return authApi.request<TeacherDashboardResponse>('/teacher/dashboard', {
      method: 'GET',
    });
  }

  public async getTeacherCourseAnalytics(
    courseId: string,
    timeframe: 'all' | '30d' | '7d' = 'all'
  ): Promise<TeacherCourseAnalyticsResponse> {
    const q = timeframe && timeframe !== 'all' ? `?timeframe=${timeframe}` : '';
    return authApi.request<TeacherCourseAnalyticsResponse>(`/teacher/courses/${courseId}/analytics${q}`, {
      method: 'GET',
    });
  }

  public async getTeacherStudentAnalytics(courseId: string, studentId: string): Promise<any> {
    return authApi.request<any>(`/teacher/courses/${courseId}/students/${studentId}/analytics`, {
      method: 'GET',
    });
  }

  public async getTeacherStudentAttempts(courseId: string, studentId: string): Promise<any> {
    return authApi.request<any>(`/teacher/courses/${courseId}/students/${studentId}/attempts`, {
      method: 'GET',
    });
  }
}

export function mapBackendUserToUserAccount(b: any): UserAccount {
  return {
    id: b.id,
    name: b.full_name,
    email: b.email,
    role: b.role,
    isActive: b.is_active,
    createdAt: b.created_at,
    lastActiveAt: b.updated_at || b.created_at,
    department: b.profile?.department || undefined,
    avatar: b.profile?.avatar_url || undefined,
  };
}

export function mapBackendAuditToAuditEvent(b: any): AuditEvent {
  return {
    id: b.id,
    timestamp: b.created_at,
    actorId: b.actor_id || 'system',
    actorName: b.actor_email ? b.actor_email.split('@')[0] : 'System',
    actorEmail: b.actor_email || 'system@learnova.edu',
    actorRole: (b.actor_role as any) || 'administrator',
    action: b.action,
    targetType: b.target_type || 'system',
    targetId: b.target_id || '',
    targetName: b.details?.target_name || b.target_id || 'System Target',
    outcome: (b.outcome as any) || 'success',
    correlationId: b.correlation_id || `corr-${b.id}`,
    reason: b.reason || undefined,
    details: b.details,
    ipAddressSafe: b.ip_address_safe || '127.0.0.1',
  };
}

export function mapBackendHealthToServiceHealth(h: SystemHealthResponse): ServiceHealthCheck[] {
  const ts = h.timestamp || new Date().toISOString();
  return [
    {
      id: 'srv-db',
      name: 'PostgreSQL Database Engine',
      category: 'database',
      status: h.database.status === 'connected' ? 'healthy' : 'degraded',
      latencyMs: h.database.latency_ms || 1,
      uptimePercent: 99.98,
      lastChecked: ts,
      description: 'Primary relational store with ACID transaction isolation.',
    },
    {
      id: 'srv-api',
      name: 'FastAPI Application Services',
      category: 'api',
      status: h.status === 'critical' ? 'unavailable' : h.status === 'degraded' ? 'degraded' : 'healthy',
      latencyMs: 3,
      uptimePercent: 99.99,
      lastChecked: ts,
      description: 'High-concurrency REST endpoints with async session handling.',
    },
    {
      id: 'srv-alembic',
      name: 'Alembic Schema Versioning',
      category: 'database',
      status: h.alembic.status === 'up_to_date' ? 'healthy' : 'degraded',
      latencyMs: 1,
      uptimePercent: 100,
      lastChecked: ts,
      description: `Target schema migration state: ${h.alembic.current_revision || 'current'}.`,
    },
    {
      id: 'srv-outbox',
      name: 'Transactional Outbox Message Bus',
      category: 'worker',
      status: h.outbox.status === 'optimal' ? 'healthy' : 'degraded',
      latencyMs: 2,
      uptimePercent: 99.95,
      lastChecked: ts,
      description: `Domain outbox: ${h.outbox.pending_events} pending, ${h.outbox.dead_letter_events} dead letters.`,
    },
    {
      id: 'srv-ai',
      name: 'Google Gemini AI Integration',
      category: 'ai_service',
      status: h.ai.status === 'operational' ? 'healthy' : 'degraded',
      latencyMs: 12,
      uptimePercent: 99.8,
      lastChecked: ts,
      description: `Provider configured: ${h.ai.configured_provider}.`,
    },
  ];
}

export const adminApi = new AdminApiClient();
