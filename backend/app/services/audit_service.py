"""Security audit event logging service."""

import logging
import uuid
from typing import Any, Dict, Optional

from sqlalchemy.orm import Session
from app.models.security_audit_event import SecurityAuditEvent

logger = logging.getLogger("learnova.audit")


def log_audit_event(
    db: Session,
    action: str,
    outcome: str,
    actor_id: Optional[uuid.UUID] = None,
    actor_email: Optional[str] = None,
    actor_role: Optional[str] = None,
    target_type: Optional[str] = None,
    target_id: Optional[str] = None,
    correlation_id: Optional[str] = None,
    reason: Optional[str] = None,
    details: Optional[Dict[str, Any]] = None,
    ip_address_safe: Optional[str] = None,
) -> Optional[SecurityAuditEvent]:
    """Record an immutable security audit event to the database session."""
    try:
        event = SecurityAuditEvent(
            actor_id=actor_id,
            actor_email=actor_email,
            actor_role=actor_role,
            action=action,
            target_type=target_type,
            target_id=str(target_id) if target_id else None,
            outcome=outcome,
            correlation_id=correlation_id,
            reason=reason,
            details=details or {},
            ip_address_safe=ip_address_safe,
        )
        db.add(event)
        return event
    except Exception as exc:
        logger.error("Failed to construct security audit event %s: %s", action, exc)
        return None
