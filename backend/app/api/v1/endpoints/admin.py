"""Administrator API endpoints for platform analytics, user directory, audit queries, and system health (Phase 10)."""

from datetime import datetime
import logging
from typing import Optional
import uuid

from fastapi import APIRouter, Depends, Query, Request, status
from sqlalchemy.orm import Session

from app.core.dependencies import get_client_ip, require_role
from app.db.session import get_db
from app.models.user import User
from app.schemas.admin import (
    AdminAuditLogListResponse,
    AdminDashboardResponse,
    AdminUserDetailResponse,
    AdminUserListResponse,
    SystemHealthResponse,
)
from app.schemas.user import (
    UserResponse,
    UserRoleUpdateRequest,
    UserStatusUpdateRequest,
)
from app.services import admin_service

logger = logging.getLogger("learnova.endpoints.admin")

router = APIRouter()


# =============================================================================
# Dashboard & Telemetry
# =============================================================================

@router.get(
    "/dashboard",
    response_model=AdminDashboardResponse,
    status_code=status.HTTP_200_OK,
    summary="Platform-level summary metrics (Administrator only)",
)
def get_dashboard(
    admin_user: User = Depends(require_role("administrator")),
    db: Session = Depends(get_db),
) -> AdminDashboardResponse:
    """Aggregate platform KPIs across users, curriculum, enrollments, assessments, and security audit."""
    return admin_service.get_admin_dashboard(db=db, admin_user=admin_user)


@router.get(
    "/system/health",
    response_model=SystemHealthResponse,
    status_code=status.HTTP_200_OK,
    summary="Safe operational system diagnostics (Administrator only)",
)
def get_system_health(
    admin_user: User = Depends(require_role("administrator")),
    db: Session = Depends(get_db),
) -> SystemHealthResponse:
    """Safe, credentials-free operational diagnostics: DB latency, pool, migrations, outbox, and AI telemetry."""
    return admin_service.get_system_health(db=db, admin_user=admin_user)


# =============================================================================
# User Directory & Account Governance
# =============================================================================

@router.get(
    "/users",
    response_model=AdminUserListResponse,
    status_code=status.HTTP_200_OK,
    summary="Paginated user directory querying (Administrator only)",
)
def list_users(
    role: Optional[str] = Query(None, description="Filter by role name (student, teacher, administrator)"),
    is_active: Optional[bool] = Query(None, description="Filter by active status"),
    search: Optional[str] = Query(None, description="Search by email or full name"),
    limit: int = Query(20, ge=1, le=100, description="Page limit"),
    offset: int = Query(0, ge=0, description="Page offset"),
    admin_user: User = Depends(require_role("administrator")),
    db: Session = Depends(get_db),
) -> AdminUserListResponse:
    """Paginated list of users with safe profile attributes (no secrets or hashes)."""
    return admin_service.list_users(
        db=db,
        admin_user=admin_user,
        role=role,
        is_active=is_active,
        search=search,
        limit=limit,
        offset=offset,
    )


@router.get(
    "/users/{user_id}",
    response_model=AdminUserDetailResponse,
    status_code=status.HTTP_200_OK,
    summary="Detailed user account inspection (Administrator only)",
)
def get_user_detail(
    user_id: uuid.UUID,
    admin_user: User = Depends(require_role("administrator")),
    db: Session = Depends(get_db),
) -> AdminUserDetailResponse:
    """Detailed user inspection including enrollment count, teaching assignments, and completed attempts."""
    return admin_service.get_user_detail(db=db, admin_user=admin_user, user_id=user_id)


@router.put(
    "/users/{user_id}/role",
    response_model=UserResponse,
    status_code=status.HTTP_200_OK,
    summary="Update a user's system role (Administrator only)",
)
def change_user_role(
    user_id: uuid.UUID,
    payload: UserRoleUpdateRequest,
    request: Request,
    admin_user: User = Depends(require_role("administrator")),
    db: Session = Depends(get_db),
) -> UserResponse:
    """Safely update user role with anti-lockout and concurrency protections."""
    ip = get_client_ip(request)
    updated_user = admin_service.update_user_role(
        db=db,
        admin_user=admin_user,
        target_user_id=user_id,
        new_role_name=payload.role,
        ip_address=ip,
    )
    return UserResponse.model_validate(updated_user)


@router.put(
    "/users/{user_id}/status",
    response_model=UserResponse,
    status_code=status.HTTP_200_OK,
    summary="Activate or deactivate a user account (Administrator only)",
)
def change_user_status(
    user_id: uuid.UUID,
    payload: UserStatusUpdateRequest,
    request: Request,
    admin_user: User = Depends(require_role("administrator")),
    db: Session = Depends(get_db),
) -> UserResponse:
    """Safely activate or deactivate user account with session revocation."""
    ip = get_client_ip(request)
    updated_user = admin_service.update_user_status(
        db=db,
        admin_user=admin_user,
        target_user_id=user_id,
        is_active=payload.is_active,
        ip_address=ip,
    )
    return UserResponse.model_validate(updated_user)


# =============================================================================
# Security Audit Logs
# =============================================================================

@router.get(
    "/audit-logs",
    response_model=AdminAuditLogListResponse,
    status_code=status.HTTP_200_OK,
    summary="Query security audit event logs (Administrator only)",
)
def get_audit_logs(
    action: Optional[str] = Query(None, description="Filter by event action name"),
    outcome: Optional[str] = Query(None, description="Filter by outcome (SUCCESS, DENIED, FAILURE)"),
    actor_id: Optional[uuid.UUID] = Query(None, description="Filter by actor UUID"),
    from_date: Optional[datetime] = Query(None, description="Filter events after UTC datetime"),
    to_date: Optional[datetime] = Query(None, description="Filter events before UTC datetime"),
    limit: int = Query(50, ge=1, le=100, description="Page limit"),
    offset: int = Query(0, ge=0, description="Page offset"),
    admin_user: User = Depends(require_role("administrator")),
    db: Session = Depends(get_db),
) -> AdminAuditLogListResponse:
    """Paginated, filterable immutable security audit log querying with IP masking."""
    return admin_service.get_audit_logs(
        db=db,
        admin_user=admin_user,
        action=action,
        outcome=outcome,
        actor_id=actor_id,
        from_date=from_date,
        to_date=to_date,
        limit=limit,
        offset=offset,
    )
