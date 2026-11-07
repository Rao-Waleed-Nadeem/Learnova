"""FastAPI request dependencies for authentication, role authorization, and course scoping."""

import logging
from typing import Callable, Optional
import uuid

from fastapi import Depends, HTTPException, Request, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session, joinedload

from app.core.security import decode_access_token
from app.db.session import get_db
from app.models.course import Course
from app.models.course_teacher import CourseTeacher
from app.models.user import User
from app.services.audit_service import log_audit_event

logger = logging.getLogger("learnova.dependencies")

bearer_scheme = HTTPBearer(auto_error=False)


def get_client_ip(request: Request) -> Optional[str]:
    """Safely extract client IP from X-Forwarded-For or direct client."""
    x_forwarded_for = request.headers.get("x-forwarded-for")
    if x_forwarded_for:
        return x_forwarded_for.split(",")[0].strip()
    return request.client.host if request.client else None


def get_current_user(
    request: Request,
    auth: Optional[HTTPAuthorizationCredentials] = Depends(bearer_scheme),
    db: Session = Depends(get_db),
) -> User:
    """Validate JWT access token and return current User instance."""
    if not auth or not auth.credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication credentials were not provided.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    token = auth.credentials
    payload = decode_access_token(token)
    if not payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials: token is invalid or expired.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    user_id_str = payload.get("sub")
    if not user_id_str:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token missing subject identity.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    try:
        user_uuid = uuid.UUID(user_id_str)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid user identifier in token.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    user = (
        db.query(User)
        .options(joinedload(User.role), joinedload(User.profile))
        .filter(User.id == user_uuid)
        .first()
    )

    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User account no longer exists.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    return user


def get_current_active_user(
    current_user: User = Depends(get_current_user),
) -> User:
    """Ensure the authenticated user account is active."""
    if not current_user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User account is deactivated.",
        )
    return current_user


def require_role(*allowed_roles: str) -> Callable[[User], User]:
    """Dependency factory enforcing that the authenticated user possesses one of the allowed roles."""

    def role_checker(
        request: Request,
        current_user: User = Depends(get_current_active_user),
        db: Session = Depends(get_db),
    ) -> User:
        user_role = current_user.role.name if current_user.role else ""
        if user_role not in allowed_roles:
            ip = get_client_ip(request)
            log_audit_event(
                db=db,
                action="rbac.access_denied",
                outcome="DENIED",
                actor_id=current_user.id,
                actor_email=current_user.email,
                actor_role=user_role,
                reason=f"Role '{user_role}' denied. Required: {allowed_roles}",
                ip_address_safe=ip,
            )
            db.commit()
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Operation not permitted. Required role: {', '.join(allowed_roles)}.",
            )
        return current_user

    return role_checker


def require_teacher_assigned_to_course(
    course_id: uuid.UUID,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
) -> User:
    """Verify that user is either an administrator or an assigned teacher for the specified course."""
    user_role = current_user.role.name if current_user.role else ""

    # Administrators have universal course access
    if user_role == "administrator":
        return current_user

    # Teachers must be assigned to the course or be its creator
    if user_role == "teacher":
        assignment = (
            db.query(CourseTeacher)
            .filter(
                CourseTeacher.course_id == course_id,
                CourseTeacher.teacher_id == current_user.id,
            )
            .first()
        )
        if assignment:
            return current_user

        course = db.query(Course).filter(Course.id == course_id).first()
        if course and course.creator_id == current_user.id:
            return current_user

        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You are not assigned as a teacher for this course.",
        )

    # Students are denied teacher course management
    raise HTTPException(
        status_code=status.HTTP_403_FORBIDDEN,
        detail="Course management requires teacher or administrator role.",
    )
