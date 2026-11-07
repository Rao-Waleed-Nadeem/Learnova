"""User profile management API endpoints."""

import logging
from fastapi import APIRouter, Depends, Request, status
from sqlalchemy.orm import Session

from app.core.dependencies import get_client_ip, get_current_active_user
from app.db.session import get_db
from app.models.profile import UserProfile
from app.models.user import User
from app.schemas.auth import MessageResponse, PasswordChangeRequest
from app.schemas.user import (
    UserPreferencesUpdateRequest,
    UserProfileUpdateRequest,
    UserResponse,
)
from app.services import auth_service

logger = logging.getLogger("learnova.endpoints.users")

router = APIRouter()


@router.put(
    "/me",
    response_model=UserResponse,
    status_code=status.HTTP_200_OK,
    summary="Update current user profile",
)
def update_profile(
    payload: UserProfileUpdateRequest,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
) -> UserResponse:
    """Update profile bio, department, avatar, or full name."""
    if payload.full_name is not None:
        current_user.full_name = payload.full_name.strip()

    if not current_user.profile:
        current_user.profile = UserProfile(user_id=current_user.id, preferences={})
        db.add(current_user.profile)

    if payload.bio is not None:
        current_user.profile.bio = payload.bio
    if payload.department is not None:
        current_user.profile.department = payload.department
    if payload.avatar_url is not None:
        current_user.profile.avatar_url = payload.avatar_url

    db.commit()
    db.refresh(current_user)
    return UserResponse.model_validate(current_user)


@router.put(
    "/me/preferences",
    response_model=UserResponse,
    status_code=status.HTTP_200_OK,
    summary="Update user UI and notification preferences",
)
def update_preferences(
    payload: UserPreferencesUpdateRequest,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
) -> UserResponse:
    """Update or merge arbitrary preferences JSON dictionary."""
    if not current_user.profile:
        current_user.profile = UserProfile(user_id=current_user.id, preferences={})
        db.add(current_user.profile)

    current_prefs = dict(current_user.profile.preferences or {})
    current_prefs.update(payload.preferences)
    current_user.profile.preferences = current_prefs

    db.commit()
    db.refresh(current_user)
    return UserResponse.model_validate(current_user)


@router.put(
    "/me/password",
    response_model=MessageResponse,
    status_code=status.HTTP_200_OK,
    summary="Change user account password",
)
def update_password(
    payload: PasswordChangeRequest,
    request: Request,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
) -> MessageResponse:
    """Validate current password, set new password, and revoke active sessions."""
    ip = get_client_ip(request)
    auth_service.change_password(
        db=db,
        user=current_user,
        request=payload,
        ip_address=ip,
    )
    return MessageResponse(message="Password changed successfully.")
