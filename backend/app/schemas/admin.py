"""Pydantic schemas for Administrator Dashboard, User Management, Audit Logs, and Diagnostics (Phase 10)."""

import uuid
from datetime import datetime
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, ConfigDict, EmailStr, Field

from app.schemas.user import UserResponse


# ============================================================================
# Admin Dashboard Schemas
# ============================================================================

class AdminUserSummary(BaseModel):
    """Platform-level user account breakdown."""

    total: int
    students: int
    teachers: int
    administrators: int
    active: int
    inactive: int


class AdminCurriculumSummary(BaseModel):
    """Platform-level curriculum volume."""

    total_courses: int
    published_courses: int
    draft_courses: int
    total_topics: int
    total_lessons: int


class AdminEnrollmentSummary(BaseModel):
    """Platform-level enrollment volume."""

    total_enrollments: int
    active_enrollments: int
    completed_enrollments: int


class AdminAssessmentSummary(BaseModel):
    """Platform-level assessment and attempt volume."""

    total_assessments: int
    total_attempts: int
    completed_attempts: int


class AdminSecurityAuditSummary(BaseModel):
    """Recent security event metrics (last 24 hours)."""

    total_events_24h: int
    blocked_events_24h: int
    failure_events_24h: int


class AdminDashboardResponse(BaseModel):
    """Comprehensive high-level administration overview."""

    users: AdminUserSummary
    curriculum: AdminCurriculumSummary
    enrollments: AdminEnrollmentSummary
    assessments: AdminAssessmentSummary
    security_audit: AdminSecurityAuditSummary
    generated_at: datetime


# ============================================================================
# Admin User Directory Schemas
# ============================================================================

class AdminUserListResponse(BaseModel):
    """Paginated user directory response."""

    items: List[UserResponse]
    total: int
    limit: int
    offset: int


class AdminUserDetailResponse(BaseModel):
    """Detailed user inspection with academic association metrics."""

    model_config = ConfigDict(from_attributes=True)

    user: UserResponse
    enrolled_courses_count: int
    assigned_courses_count: int
    completed_attempts_count: int
    security_audit_events_count: int


# ============================================================================
# Security Audit Log Schemas
# ============================================================================

class SecurityAuditEventResponse(BaseModel):
    """Serialized security audit event record (safe projection)."""

    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    actor_id: Optional[uuid.UUID] = None
    actor_email: Optional[str] = None
    actor_role: Optional[str] = None
    action: str
    target_type: Optional[str] = None
    target_id: Optional[str] = None
    outcome: str
    correlation_id: Optional[str] = None
    reason: Optional[str] = None
    details: Dict[str, Any] = Field(default_factory=dict)
    ip_address_safe: Optional[str] = None
    created_at: datetime


class AdminAuditLogListResponse(BaseModel):
    """Paginated audit logs response."""

    items: List[SecurityAuditEventResponse]
    total: int
    limit: int
    offset: int


# ============================================================================
# Safe System Telemetry Schemas
# ============================================================================

class SystemHealthDatabase(BaseModel):
    """Database connectivity and latency diagnostics."""

    status: str  # "connected" | "disconnected"
    latency_ms: float
    pool_size: Optional[int] = None


class SystemHealthAlembic(BaseModel):
    """Alembic migration revision diagnostics."""

    current_head: str
    is_up_to_date: bool


class SystemHealthOutbox(BaseModel):
    """Domain outbox queue telemetry."""

    pending_count: int
    failed_count: int
    processed_count: int


class SystemHealthAI(BaseModel):
    """AI adapter operational telemetry."""

    model: str
    is_live_configured: bool
    cache_ttl_days: int


class SystemHealthResponse(BaseModel):
    """Safe, credentials-free platform operational telemetry."""

    status: str  # "healthy" | "degraded"
    database: SystemHealthDatabase
    alembic: SystemHealthAlembic
    outbox: SystemHealthOutbox
    ai_service: SystemHealthAI
    version: str
    timestamp: datetime
