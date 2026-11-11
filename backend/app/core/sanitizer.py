"""PII scrubbing and sensitive data sanitization utility for AI workflows (Phase 9)."""

import re
from typing import Optional

# Pre-compiled regex patterns for sensitive data scrubbing
EMAIL_REGEX = re.compile(
    r"\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b"
)
PHONE_REGEX = re.compile(
    r"(?:\+?\d{1,3}[-.\s]?)?(?:\(?\d{2,4}\)?[-.\s]?)?\d{3,4}[-.\s]?\d{3,4}\b"
)
GOOGLE_API_KEY_REGEX = re.compile(
    r"\bAIza[0-9A-Za-z\-_]{35}\b"
)
GENERIC_API_KEY_REGEX = re.compile(
    r"\b(?:sk|pk|api[_-]?key)[-_][A-Za-z0-9_\-]{16,}\b", re.IGNORECASE
)
JWT_BEARER_REGEX = re.compile(
    r"\b(?:Bearer\s+)?[A-Za-z0-9-_]{20,}\.[A-Za-z0-9-_]{20,}\.[A-Za-z0-9-_]{20,}\b"
)
PASSWORD_ASSIGNMENT_REGEX = re.compile(
    r"(?i)\b(password|passwd|secret|api_key|token)\s*[:=]\s*['\"]?[^\s,'\"]+['\"]?"
)
CREDIT_CARD_REGEX = re.compile(
    r"\b(?:\d{4}[-\s]?){3}\d{4}\b"
)


def scrub_pii(text: Optional[str]) -> str:
    """Scrub sensitive PII, credentials, keys, and tokens from arbitrary text before LLM dispatch."""
    if not text:
        return ""

    sanitized = text

    # Redact passwords/secrets first (before token/email matches break them)
    sanitized = PASSWORD_ASSIGNMENT_REGEX.sub(r"\1=[SECRET_REDACTED]", sanitized)

    # Redact API keys and JWTs
    sanitized = GOOGLE_API_KEY_REGEX.sub("[API_KEY_REDACTED]", sanitized)
    sanitized = GENERIC_API_KEY_REGEX.sub("[API_KEY_REDACTED]", sanitized)
    sanitized = JWT_BEARER_REGEX.sub("[TOKEN_REDACTED]", sanitized)

    # Redact email addresses and credit cards
    sanitized = EMAIL_REGEX.sub("[EMAIL_REDACTED]", sanitized)
    sanitized = CREDIT_CARD_REGEX.sub("[CARD_REDACTED]", sanitized)

    # Redact phone numbers (guarding against short digit sequences)
    def _phone_repl(match: re.Match) -> str:
        raw = match.group(0)
        digits_only = re.sub(r"\D", "", raw)
        # Typical phone numbers have 7 to 15 digits
        if 7 <= len(digits_only) <= 15:
            return "[PHONE_REDACTED]"
        return raw

    sanitized = PHONE_REGEX.sub(_phone_repl, sanitized)

    return sanitized
