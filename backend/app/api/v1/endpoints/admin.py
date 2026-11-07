"""Administrator API endpoints for privileged user management."""

import logging
import uuid

from fastapi import APIRouter, Depends, Request, status
from sqlalchemy.orm import Session

from app.core.dependencies import get_client_ip, require_role
from app.db.session import get_db
from app.models.user import User
from app.schemas.user import (
    UserResponse,
    UserRoleUpdateRequest,
    UserStatusUpdateRequest,
)
from app.services import admin_service

logger = logging.getLogger("learnova.endpoints.admin")

router = APIRouter()


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
