/**
 * Admin & Analytics API Client (Slice 9, ADM-01 - ADM-08, TEA-01 - TEA-04).
 * Communicates with backend endpoints (/api/v1/admin/* and /api/v1/teacher/*).
 */

import { authApi } from './authApi';
import { UserAccount, AuditEvent } from '../../types';
import { ServiceHealthCheck } from '../../utils/adminLogic';

export interface AdminDashboardResponse {
  users_summary: {
    total: number;
    students: number;
    teachers: number;
    administrators: number;
    active: number;
    deactivated: number;
  };
  curriculum_summary: {
    courses: number;
    published_courses: number;
    draft_courses: number;
    topics: number;
    lessons: number;
    resources: number;
  };
  enrollment_summary: {
    total: number;
    active: number;
    completed: number;
    dropped: number;
  };
  assessment_summary: {
    total_assessments: number;
    published_assessments: number;
    total_attempts: number;
    completed_attempts: number;
  };
  security_summary: {
    total_events_24h: number;
    failures_blocked_24h: number;
    unique_active_users_24h: number;
  };
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

export interface TeacherCourseAnalyticsResponse {
  course_id: string;
  course_title: string;
  enrolled_students_count: number;
  active_students_count: number;
  completion_rate_percent: number;
  average_course_mastery_percent: number;
  topic_mastery_distribution: any[];
  assessment_summaries: any[];
  at_risk_students: any[];
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
    role?: string;
    is_active?: boolean;
    page?: number;
    page_size?: number;
  }): Promise<AdminUserListResponse> {
    const q = new URLSearchParams();
    if (params?.query) q.set('query', params.query);
    if (params?.role && params.role !== 'all') q.set('role', params.role);
    if (params?.is_active !== undefined) q.set('is_active', String(params.is_active));
    if (params?.page) q.set('page', String(params.page));
    if (params?.page_size) q.set('page_size', String(params.page_size));

    const qs = q.toString();
    const url = qs ? `/admin/users?${qs}` : '/admin/users';
    return authApi.request<AdminUserListResponse>(url, {
      method: 'GET',
    });
  }

  // ADM-03: User Details
  public async getUserDetail(userId: string): Promise<any> {
    return authApi.request<any>(`/admin/users/${userId}`, {
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
    page?: number;
    page_size?: number;
  }): Promise<AdminAuditLogListResponse> {
    const q = new URLSearchParams();
    if (params?.actor_id) q.set('actor_id', params.actor_id);
    if (params?.action && params.action !== 'all') q.set('action', params.action);
    if (params?.outcome && params.outcome !== 'all') q.set('outcome', params.outcome);
    if (params?.start_date) q.set('start_date', params.start_date);
    if (params?.end_date) q.set('end_date', params.end_date);
    if (params?.page) q.set('page', String(params.page));
    if (params?.page_size) q.set('page_size', String(params.page_size));

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

  public async getTeacherCourseAnalytics(courseId: string): Promise<TeacherCourseAnalyticsResponse> {
    return authApi.request<TeacherCourseAnalyticsResponse>(`/teacher/courses/${courseId}/analytics`, {
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
