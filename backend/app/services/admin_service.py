"""Administrator operations service enforcing concurrency-safe role and status mutations."""

import logging
from typing import Optional
import uuid

from fastapi import HTTPException, status
from sqlalchemy.orm import Session, joinedload

from app.models.role import Role
from app.models.session import UserSession
from app.models.user import User
from app.services.audit_service import log_audit_event

logger = logging.getLogger("learnova.admin_service")


def update_user_role(
    db: Session,
    admin_user: User,
    target_user_id: uuid.UUID,
    new_role_name: str,
    ip_address: Optional[str] = None,
) -> User:
    """Safely change a user's role with self-demotion and last-admin protections."""
    # 1. Guard against self-demotion
    if admin_user.id == target_user_id and new_role_name != "administrator":
        log_audit_event(
            db=db,
            action="admin.user.role_change",
            outcome="DENIED",
            actor_id=admin_user.id,
            actor_email=admin_user.email,
            actor_role=admin_user.role.name,
            target_type="user",
            target_id=str(target_user_id),
            reason="Self-demotion blocked",
            ip_address_safe=ip_address,
        )
        db.commit()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Administrators cannot change their own role.",
        )

    # 2. Verify target role exists
    target_role = db.query(Role).filter(Role.name == new_role_name).first()
    if not target_role:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Role '{new_role_name}' is not recognized.",
        )

    # 3. Lock target user row to prevent concurrent role mutation
    target_user = (
        db.query(User)
        .options(joinedload(User.role), joinedload(User.profile))
        .with_for_update()
        .filter(User.id == target_user_id)
        .first()
    )
    if not target_user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found.",
        )

    admin_role = db.query(Role).filter(Role.name == "administrator").first()

    # 4. If target is an administrator being demoted, lock and verify count of remaining active admins
    if target_user.role_id == admin_role.id and new_role_name != "administrator":
        active_admins_count = (
            db.query(User)
            .with_for_update()
            .filter(User.role_id == admin_role.id, User.is_active == True)
            .count()
        )
        if active_admins_count <= 1:
            log_audit_event(
                db=db,
                action="admin.user.role_change",
                outcome="DENIED",
                actor_id=admin_user.id,
                actor_email=admin_user.email,
                actor_role=admin_user.role.name,
                target_type="user",
                target_id=str(target_user_id),
                reason="Last active administrator demotion blocked",
                ip_address_safe=ip_address,
            )
            db.commit()
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cannot demote the last active administrator.",
            )

    old_role_name = target_user.role.name
    target_user.role_id = target_role.id

    log_audit_event(
        db=db,
        action="admin.user.role_change",
        outcome="SUCCESS",
        actor_id=admin_user.id,
        actor_email=admin_user.email,
        actor_role=admin_user.role.name,
        target_type="user",
        target_id=str(target_user.id),
        details={"from_role": old_role_name, "to_role": new_role_name},
        ip_address_safe=ip_address,
    )
    db.commit()

    db.refresh(target_user)
    return target_user


def update_user_status(
    db: Session,
    admin_user: User,
    target_user_id: uuid.UUID,
    is_active: bool,
    ip_address: Optional[str] = None,
) -> User:
    """Safely toggle user account active status with self-deactivation and last-admin protections."""
    # 1. Guard against self-deactivation
    if admin_user.id == target_user_id and not is_active:
        log_audit_event(
            db=db,
            action="admin.user.status_change",
            outcome="DENIED",
            actor_id=admin_user.id,
            actor_email=admin_user.email,
            actor_role=admin_user.role.name,
            target_type="user",
            target_id=str(target_user_id),
            reason="Self-deactivation blocked",
            ip_address_safe=ip_address,
        )
        db.commit()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Administrators cannot deactivate their own account.",
        )

    # 2. Lock target user row
    target_user = (
        db.query(User)
        .options(joinedload(User.role), joinedload(User.profile))
        .with_for_update()
        .filter(User.id == target_user_id)
        .first()
    )
    if not target_user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found.",
        )

    admin_role = db.query(Role).filter(Role.name == "administrator").first()

    # 3. If target is an administrator being deactivated, lock and verify count of remaining active admins
    if target_user.role_id == admin_role.id and not is_active:
        active_admins_count = (
            db.query(User)
            .with_for_update()
            .filter(User.role_id == admin_role.id, User.is_active == True)
            .count()
        )
        if active_admins_count <= 1:
            log_audit_event(
                db=db,
                action="admin.user.status_change",
                outcome="DENIED",
                actor_id=admin_user.id,
                actor_email=admin_user.email,
                actor_role=admin_user.role.name,
                target_type="user",
                target_id=str(target_user_id),
                reason="Last active administrator deactivation blocked",
                ip_address_safe=ip_address,
            )
            db.commit()
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cannot deactivate the last active administrator.",
            )

    target_user.is_active = is_active

    # 4. If account is deactivated, revoke all outstanding sessions immediately
    if not is_active:
        db.query(UserSession).filter(
            UserSession.user_id == target_user.id,
            UserSession.is_revoked == False,
        ).update({"is_revoked": True})

    log_audit_event(
        db=db,
        action="admin.user.status_change",
        outcome="SUCCESS",
        actor_id=admin_user.id,
        actor_email=admin_user.email,
        actor_role=admin_user.role.name,
        target_type="user",
        target_id=str(target_user.id),
        details={"is_active": is_active},
        ip_address_safe=ip_address,
    )
    db.commit()

    db.refresh(target_user)
    return target_user
