"""Authentication service handling registration, login, token rotation, and logout."""

import base64
from datetime import datetime, timedelta, timezone
import json
import logging
from typing import Any, Dict, Optional, Tuple
import urllib.parse
import urllib.request
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
from app.schemas.auth import GoogleAuthRequest, PasswordChangeRequest, UserLoginRequest, UserRegisterRequest
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


def _parse_jwt_payload_unverified(token: str) -> Dict[str, Any]:
    """Safely extracts JSON claims from unverified JWT token."""
    parts = token.split(".")
    if len(parts) >= 2:
        try:
            padded = parts[1] + "=" * ((4 - len(parts[1]) % 4) % 4)
            decoded = base64.urlsafe_b64decode(padded.encode("utf-8")).decode("utf-8")
            return json.loads(decoded)
        except Exception:
            pass
    return {}


def _resolve_google_profile(
    credential: str,
    fallback_email: Optional[str] = None,
    fallback_name: Optional[str] = None,
    fallback_avatar: Optional[str] = None,
) -> Tuple[str, str, Optional[str]]:
    """
    Extracts email, full name, and avatar from Google credential or dev fallback.
    Supports Google ID tokens, development simulated tokens, and direct payload overrides.
    """
    email: Optional[str] = fallback_email
    name: Optional[str] = fallback_name
    avatar: Optional[str] = fallback_avatar

    # 1. Check if token contains base64/JWT claims
    claims = _parse_jwt_payload_unverified(credential)
    if claims:
        email = claims.get("email") or email
        name = claims.get("name") or claims.get("given_name") or name
        avatar = claims.get("picture") or avatar

    # 2. Check for dev-mode custom token pattern "dev-google-token:<email>:<name>"
    if credential.startswith("dev-google-token:"):
        parts = credential.split(":")
        if len(parts) >= 2 and parts[1]:
            email = parts[1]
        if len(parts) >= 3 and parts[2]:
            name = parts[2]

    # 3. If live network check is feasible and not dev mode token
    if credential and not credential.startswith("dev-") and ("." in credential) and not email:
        try:
            req_url = f"https://oauth2.googleapis.com/tokeninfo?id_token={urllib.parse.quote(credential)}"
            with urllib.request.urlopen(req_url, timeout=4) as resp:
                if resp.status == 200:
                    data = json.loads(resp.read().decode("utf-8"))
                    email = data.get("email") or email
                    name = data.get("name") or name
                    avatar = data.get("picture") or avatar
        except Exception as exc:
            logger.warning("Google tokeninfo remote check bypassed/failed: %s", exc)

    if not email:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Unable to verify Google credentials or retrieve account email.",
        )

    clean_email = email.lower().strip()
    clean_name = name.strip() if name and name.strip() else clean_email.split("@")[0].replace(".", " ").title()
    return clean_email, clean_name, avatar


def authenticate_google_user(
    db: Session,
    request: GoogleAuthRequest,
    ip_address: Optional[str] = None,
    user_agent: Optional[str] = None,
) -> Tuple[User, str, str]:
    """
    Authenticate or auto-provision a student user via Google OAuth 2.0.
    Generates a secure user session, creates an access token, and issues a refresh token.
    """
    email_clean, full_name, avatar_url = _resolve_google_profile(
        credential=request.credential,
        fallback_email=request.email,
        fallback_name=request.full_name,
        fallback_avatar=request.avatar_url,
    )

    user = (
        db.query(User)
        .options(joinedload(User.role), joinedload(User.profile))
        .filter(User.email == email_clean)
        .first()
    )

    is_new_user = False
    if not user:
        # Auto-provision new student account
        student_role = db.query(Role).filter(Role.name == "student").first()
        if not student_role:
            logger.error("Canonical 'student' role missing in database")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="System configuration error: student role not found.",
            )

        random_secret = uuid.uuid4().hex + uuid.uuid4().hex
        new_user = User(
            email=email_clean,
            hashed_password=hash_password(random_secret),
            full_name=full_name,
            role_id=student_role.id,
            is_active=True,
        )
        db.add(new_user)
        db.flush()

        profile = UserProfile(
            user_id=new_user.id,
            avatar_url=avatar_url,
            preferences={"theme": "system", "email_notifications": True},
        )
        db.add(profile)
        db.flush()

        is_new_user = True
        user = (
            db.query(User)
            .options(joinedload(User.role), joinedload(User.profile))
            .filter(User.id == new_user.id)
            .first()
        )
    else:
        # Existing user check
        if not user.is_active:
            log_audit_event(
                db=db,
                action="auth.google_login",
                outcome="DENIED",
                actor_id=user.id,
                actor_email=user.email,
                actor_role=user.role.name if user.role else "unknown",
                reason="Account deactivated",
                ip_address_safe=ip_address,
            )
            db.commit()
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Account is deactivated. Please contact an administrator.",
            )

        # Update avatar if profile lacks one but Google provided one
        if avatar_url and user.profile and not user.profile.avatar_url:
            user.profile.avatar_url = avatar_url

    # Issue session
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
        action="auth.google_register" if is_new_user else "auth.google_login",
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
