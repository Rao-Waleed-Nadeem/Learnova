"""Authentication API endpoints for registration, login, token refresh, and logout."""

import logging
from typing import Optional

from fastapi import APIRouter, Cookie, Depends, Request, Response, status
from sqlalchemy.orm import Session

from app.core.dependencies import (
    bearer_scheme,
    get_client_ip,
    get_current_active_user,
    get_current_user,
)
from app.db.session import get_db
from app.models.user import User
from app.schemas.auth import (
    MessageResponse,
    TokenRefreshResponse,
    TokenResponse,
    UserLoginRequest,
    UserRegisterRequest,
)
from app.schemas.user import UserResponse
from app.services import auth_service
from app.services.auth_service import REFRESH_COOKIE_NAME, clear_refresh_token_cookie, set_refresh_token_cookie

logger = logging.getLogger("learnova.endpoints.auth")

router = APIRouter()


@router.post(
    "/register",
    response_model=TokenResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Register a new student account",
)
def register(
    payload: UserRegisterRequest,
    request: Request,
    response: Response,
    db: Session = Depends(get_db),
) -> TokenResponse:
    """Public registration for students with automatic login and cookie issuance."""
    ip = get_client_ip(request)
    user_agent = request.headers.get("user-agent")

    user, access_token, refresh_token = auth_service.register_user(
        db=db,
        request=payload,
        ip_address=ip,
        user_agent=user_agent,
    )

    set_refresh_token_cookie(response, refresh_token)
    return TokenResponse(
        access_token=access_token,
        token_type="bearer",
        user=UserResponse.model_validate(user),
    )


@router.post(
    "/login",
    response_model=TokenResponse,
    status_code=status.HTTP_200_OK,
    summary="Authenticate with email and password",
)
def login(
    payload: UserLoginRequest,
    request: Request,
    response: Response,
    db: Session = Depends(get_db),
) -> TokenResponse:
    """Authenticate credentials and issue a short-lived access token and refresh cookie."""
    ip = get_client_ip(request)
    user_agent = request.headers.get("user-agent")

    user, access_token, refresh_token = auth_service.login_user(
        db=db,
        request=payload,
        ip_address=ip,
        user_agent=user_agent,
    )

    set_refresh_token_cookie(response, refresh_token)
    return TokenResponse(
        access_token=access_token,
        token_type="bearer",
        user=UserResponse.model_validate(user),
    )


@router.post(
    "/refresh",
    response_model=TokenRefreshResponse,
    status_code=status.HTTP_200_OK,
    summary="Rotate refresh token and issue new access token",
)
def refresh(
    request: Request,
    response: Response,
    learnova_refresh_token: Optional[str] = Cookie(default=None),
    db: Session = Depends(get_db),
) -> TokenRefreshResponse:
    """Validate and rotate the HttpOnly refresh token cookie."""
    ip = get_client_ip(request)
    user_agent = request.headers.get("user-agent")

    cookie_token = learnova_refresh_token or request.cookies.get(REFRESH_COOKIE_NAME)
    new_access_token, new_refresh_token = auth_service.refresh_session(
        db=db,
        raw_refresh_token=cookie_token or "",
        ip_address=ip,
        user_agent=user_agent,
    )

    set_refresh_token_cookie(response, new_refresh_token)
    return TokenRefreshResponse(
        access_token=new_access_token,
        token_type="bearer",
    )


@router.post(
    "/logout",
    response_model=MessageResponse,
    status_code=status.HTTP_200_OK,
    summary="Revoke session and clear refresh token cookie",
)
def logout(
    request: Request,
    response: Response,
    learnova_refresh_token: Optional[str] = Cookie(default=None),
    db: Session = Depends(get_db),
) -> MessageResponse:
    """Revoke user session and delete the authentication cookie."""
    ip = get_client_ip(request)
    cookie_token = learnova_refresh_token or request.cookies.get(REFRESH_COOKIE_NAME)

    current_user: Optional[User] = None
    try:
        current_user = get_current_user(request=request, auth=Depends(bearer_scheme), db=db)
    except Exception:
        pass

    auth_service.logout_session(
        db=db,
        raw_refresh_token=cookie_token,
        current_user=current_user,
        ip_address=ip,
    )

    clear_refresh_token_cookie(response)
    return MessageResponse(message="Successfully logged out.")


@router.get(
    "/me",
    response_model=UserResponse,
    status_code=status.HTTP_200_OK,
    summary="Get current authenticated user profile",
)
def get_current_user_profile(
    current_user: User = Depends(get_current_active_user),
) -> UserResponse:
    """Return the profile and role information for the active caller."""
    return UserResponse.model_validate(current_user)
