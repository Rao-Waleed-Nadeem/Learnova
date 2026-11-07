"""Security utility functions for password hashing, JWT creation, and verification."""

from datetime import datetime, timedelta, timezone
import hashlib
import logging
import secrets
from typing import Any, Dict, Optional

import bcrypt
import jwt

from app.core.config import settings

logger = logging.getLogger("learnova.security")


def hash_password(password: str) -> str:
    """Hash a plaintext password using bcrypt with a generated salt."""
    salt = bcrypt.gensalt(rounds=12)
    return bcrypt.hashpw(password.encode("utf-8"), salt).decode("utf-8")


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a plaintext password against a stored hash."""
    try:
        # Check for standard bcrypt format
        if hashed_password.startswith("$2b$") or hashed_password.startswith("$2a$") or hashed_password.startswith("$2y$"):
            return bcrypt.checkpw(plain_password.encode("utf-8"), hashed_password.encode("utf-8"))
        # Fallback for seed format sha256$<digest>
        if hashed_password.startswith("sha256$"):
            expected = hashed_password.split("$", 1)[1]
            actual = hashlib.sha256(plain_password.encode("utf-8")).hexdigest()
            return secrets.compare_digest(actual, expected)
        return False
    except Exception as exc:
        logger.warning("Password verification failed with error: %s", exc)
        return False


def hash_refresh_token(token: str) -> str:
    """Generate SHA-256 hash of a refresh token to avoid storing raw tokens in database."""
    return hashlib.sha256(token.encode("utf-8")).hexdigest()


def generate_refresh_token() -> str:
    """Generate a high-entropy cryptographically random refresh token string."""
    return secrets.token_urlsafe(48)


def create_access_token(
    subject: str,
    role: str,
    expires_delta: Optional[timedelta] = None,
    extra_claims: Optional[Dict[str, Any]] = None,
) -> str:
    """Create a signed JWT access token."""
    now = datetime.now(timezone.utc)
    if expires_delta:
        expire = now + expires_delta
    else:
        expire = now + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)

    payload: Dict[str, Any] = {
        "sub": str(subject),
        "role": role,
        "type": "access",
        "iat": int(now.timestamp()),
        "exp": int(expire.timestamp()),
    }
    if extra_claims:
        payload.update(extra_claims)

    return jwt.encode(payload, settings.SECRET_KEY, algorithm=settings.ALGORITHM)


def decode_access_token(token: str) -> Optional[Dict[str, Any]]:
    """Decode and validate a signed JWT access token."""
    try:
        payload = jwt.decode(
            token,
            settings.SECRET_KEY,
            algorithms=[settings.ALGORITHM],
            options={"require": ["exp", "sub", "type"]},
        )
        if payload.get("type") != "access":
            logger.warning("Token rejected: incorrect token type '%s'", payload.get("type"))
            return None
        return payload
    except jwt.ExpiredSignatureError:
        logger.info("Token validation failed: signature has expired")
        return None
    except jwt.PyJWTError as exc:
        logger.warning("Token validation failed: %s", exc)
        return None
