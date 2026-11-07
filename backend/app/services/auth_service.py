"""Authentication service handling registration, login, token rotation, and logout."""

from datetime import datetime, timedelta, timezone
import logging
from typing import Optional, Tuple
import uuid

from fastapi import HTTPException, Response, status
from sqlalchemy.orm import Session, joinedload

from app.core.config import settings
from app.core.security import (
    create_access_token,
    generate_refresh_token,
    hash_password,
    hash_refresh_token,
    verify_password,
)
from app.models.profile import UserProfile
from app.models.role import Role
from app.models.session import UserSession
from app.models.user import User
from app.schemas.auth import PasswordChangeRequest, UserLoginRequest, UserRegisterRequest
from app.services.audit_service import log_audit_event

logger = logging.getLogger("learnova.auth_service")

REFRESH_COOKIE_NAME = "learnova_refresh_token"
REFRESH_COOKIE_PATH = "/api/v1/auth"


def set_refresh_token_cookie(response: Response, refresh_token: str) -> None:
    """Attach the HttpOnly refresh token cookie to the response."""
    # In development over plain HTTP, secure must be False so browsers store the cookie
    secure_cookie = settings.ENVIRONMENT.lower() not in ("development", "test", "testing")
    response.set_cookie(
        key=REFRESH_COOKIE_NAME,
        value=refresh_token,
        httponly=True,
        secure=secure_cookie,
        samesite="lax",
        max_age=settings.REFRESH_TOKEN_EXPIRE_DAYS * 86400,
        path=REFRESH_COOKIE_PATH,
    )


def clear_refresh_token_cookie(response: Response) -> None:
    """Clear the HttpOnly refresh token cookie."""
    response.delete_cookie(
        key=REFRESH_COOKIE_NAME,
        path=REFRESH_COOKIE_PATH,
    )


def register_user(
    db: Session,
    request: UserRegisterRequest,
    ip_address: Optional[str] = None,
    user_agent: Optional[str] = None,
) -> Tuple[User, str, str]:
    """Register a new student account, generate initial session and access token."""
    email_clean = request.email.lower().strip()
    existing_user = db.query(User).filter(User.email == email_clean).first()
    if existing_user:
        log_audit_event(
            db=db,
            action="auth.register",
            outcome="FAILURE",
            actor_email=email_clean,
            reason="Email already exists",
            ip_address_safe=ip_address,
        )
        db.commit()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="A user with this email address already exists.",
        )

    # Public registration strictly provisions student accounts
    student_role = db.query(Role).filter(Role.name == "student").first()
    if not student_role:
        logger.error("Canonical 'student' role missing in database")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="System configuration error: student role not found.",
        )

    # Create user with bcrypt password hash
    new_user = User(
        email=email_clean,
        hashed_password=hash_password(request.password),
        full_name=request.full_name.strip(),
        role_id=student_role.id,
        is_active=True,
    )
    db.add(new_user)
    db.flush()  # assign user.id

    # Create associated user profile with default preferences
    profile = UserProfile(
        user_id=new_user.id,
        preferences={"theme": "system", "email_notifications": True},
    )
    db.add(profile)

    # Generate session and tokens
    raw_refresh_token = generate_refresh_token()
    token_hash = hash_refresh_token(raw_refresh_token)
    session_expires = datetime.now(timezone.utc) + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)

    session = UserSession(
        user_id=new_user.id,
        refresh_token_hash=token_hash,
        is_revoked=False,
        expires_at=session_expires,
        user_agent=user_agent,
        ip_address=ip_address,
    )
    db.add(session)

    log_audit_event(
        db=db,
        action="auth.register",
        outcome="SUCCESS",
        actor_id=new_user.id,
        actor_email=new_user.email,
        actor_role="student",
        target_type="user",
        target_id=str(new_user.id),
        ip_address_safe=ip_address,
    )

    db.commit()

    # Re-query user with role and profile loaded
    user = (
        db.query(User)
        .options(joinedload(User.role), joinedload(User.profile))
        .filter(User.id == new_user.id)
        .first()
    )

    access_token = create_access_token(subject=str(user.id), role="student")
    return user, access_token, raw_refresh_token


def login_user(
    db: Session,
    request: UserLoginRequest,
    ip_address: Optional[str] = None,
    user_agent: Optional[str] = None,
) -> Tuple[User, str, str]:
    """Authenticate credentials and issue new session and tokens."""
    email_clean = request.email.lower().strip()
    user = (
        db.query(User)
        .options(joinedload(User.role), joinedload(User.profile))
        .filter(User.email == email_clean)
        .first()
    )

    if not user:
        log_audit_event(
            db=db,
            action="auth.login",
            outcome="FAILURE",
            actor_email=email_clean,
            reason="User not found",
            ip_address_safe=ip_address,
        )
        db.commit()
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if not verify_password(request.password, user.hashed_password):
        log_audit_event(
            db=db,
            action="auth.login",
            outcome="FAILURE",
            actor_id=user.id,
            actor_email=user.email,
            actor_role=user.role.name,
            reason="Invalid credentials",
            ip_address_safe=ip_address,
        )
        db.commit()
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if not user.is_active:
        log_audit_event(
            db=db,
            action="auth.login",
            outcome="DENIED",
            actor_id=user.id,
            actor_email=user.email,
            actor_role=user.role.name,
            reason="Account deactivated",
            ip_address_safe=ip_address,
        )
        db.commit()
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account is deactivated. Please contact an administrator.",
        )

    # Valid credentials and active user: create session
    raw_refresh_token = generate_refresh_token()
    token_hash = hash_refresh_token(raw_refresh_token)
    session_expires = datetime.now(timezone.utc) + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)

    session = UserSession(
        user_id=user.id,
        refresh_token_hash=token_hash,
        is_revoked=False,
        expires_at=session_expires,
        user_agent=user_agent,
        ip_address=ip_address,
    )
    db.add(session)

    log_audit_event(
        db=db,
        action="auth.login",
        outcome="SUCCESS",
        actor_id=user.id,
        actor_email=user.email,
        actor_role=user.role.name,
        target_type="session",
        target_id=str(session.id),
        ip_address_safe=ip_address,
    )
    db.commit()

    access_token = create_access_token(subject=str(user.id), role=user.role.name)
    return user, access_token, raw_refresh_token


def refresh_session(
    db: Session,
    raw_refresh_token: str,
    ip_address: Optional[str] = None,
    user_agent: Optional[str] = None,
) -> Tuple[str, str]:
    """Rotate an active refresh token and issue a fresh access token."""
    if not raw_refresh_token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Refresh token required.",
        )

    token_hash = hash_refresh_token(raw_refresh_token)
    session = (
        db.query(UserSession)
        .options(joinedload(UserSession.user).joinedload(User.role))
        .filter(UserSession.refresh_token_hash == token_hash)
        .first()
    )

    now = datetime.now(timezone.utc)

    if not session or session.is_revoked:
        log_audit_event(
            db=db,
            action="auth.refresh",
            outcome="FAILURE",
            reason="Token not found or already revoked",
            ip_address_safe=ip_address,
        )
        db.commit()
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or revoked refresh token.",
        )

    # Handle timezone-aware or naive comparison safely
    expires_at = session.expires_at
    if expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)

    if expires_at <= now:
        session.is_revoked = True
        log_audit_event(
            db=db,
            action="auth.refresh",
            outcome="FAILURE",
            actor_id=session.user_id,
            reason="Token expired",
            ip_address_safe=ip_address,
        )
        db.commit()
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Refresh token has expired.",
        )

    if not session.user.is_active:
        session.is_revoked = True
        log_audit_event(
            db=db,
            action="auth.refresh",
            outcome="DENIED",
            actor_id=session.user_id,
            reason="Account deactivated",
            ip_address_safe=ip_address,
        )
        db.commit()
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account is deactivated.",
        )

    # Token rotation: revoke old session and mint new session
    session.is_revoked = True
    session.last_used_at = now

    new_raw_refresh_token = generate_refresh_token()
    new_hash = hash_refresh_token(new_raw_refresh_token)
    new_expires = now + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)

    new_session = UserSession(
        user_id=session.user_id,
        refresh_token_hash=new_hash,
        is_revoked=False,
        expires_at=new_expires,
        user_agent=user_agent or session.user_agent,
        ip_address=ip_address or session.ip_address,
    )
    db.add(new_session)

    log_audit_event(
        db=db,
        action="auth.refresh",
        outcome="SUCCESS",
        actor_id=session.user_id,
        actor_email=session.user.email,
        actor_role=session.user.role.name,
        target_type="session",
        target_id=str(new_session.id),
        ip_address_safe=ip_address,
    )
    db.commit()

    new_access_token = create_access_token(
        subject=str(session.user_id),
        role=session.user.role.name,
    )
    return new_access_token, new_raw_refresh_token


def logout_session(
    db: Session,
    raw_refresh_token: Optional[str],
    current_user: Optional[User] = None,
    ip_address: Optional[str] = None,
) -> None:
    """Revoke user session and audit event."""
    if raw_refresh_token:
        token_hash = hash_refresh_token(raw_refresh_token)
        session = db.query(UserSession).filter(UserSession.refresh_token_hash == token_hash).first()
        if session:
            session.is_revoked = True
            log_audit_event(
                db=db,
                action="auth.logout",
                outcome="SUCCESS",
                actor_id=session.user_id,
                target_type="session",
                target_id=str(session.id),
                ip_address_safe=ip_address,
            )
            db.commit()
            return

    if current_user:
        log_audit_event(
            db=db,
            action="auth.logout",
            outcome="SUCCESS",
            actor_id=current_user.id,
            actor_email=current_user.email,
            actor_role=current_user.role.name,
            ip_address_safe=ip_address,
        )
        db.commit()


def change_password(
    db: Session,
    user: User,
    request: PasswordChangeRequest,
    ip_address: Optional[str] = None,
) -> None:
    """Validate current password, apply new password, and revoke prior sessions."""
    if not verify_password(request.current_password, user.hashed_password):
        log_audit_event(
            db=db,
            action="auth.password.change",
            outcome="FAILURE",
            actor_id=user.id,
            actor_email=user.email,
            reason="Current password incorrect",
            ip_address_safe=ip_address,
        )
        db.commit()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Current password is incorrect.",
        )

    if request.current_password == request.new_password:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="New password must be different from current password.",
        )

    user.hashed_password = hash_password(request.new_password)

    # Invalidate all prior sessions for security
    db.query(UserSession).filter(
        UserSession.user_id == user.id,
        UserSession.is_revoked == False,
    ).update({"is_revoked": True})

    log_audit_event(
        db=db,
        action="auth.password.change",
        outcome="SUCCESS",
        actor_id=user.id,
        actor_email=user.email,
        actor_role=user.role.name,
        target_type="user",
        target_id=str(user.id),
        ip_address_safe=ip_address,
    )
    db.commit()
