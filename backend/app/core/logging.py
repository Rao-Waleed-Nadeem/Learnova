"""Logging configuration module for Learnova backend."""

import logging
import sys
from app.core.config import settings


class SecretScrubbingFilter(logging.Filter):
    """Filter that scrubs database passwords and tokens from log messages."""

    def filter(self, record: logging.LogRecord) -> bool:
        if isinstance(record.msg, str):
            if settings.POSTGRES_PASSWORD and settings.POSTGRES_PASSWORD != "learnova":
                record.msg = record.msg.replace(settings.POSTGRES_PASSWORD, "***")
        return True


def setup_logging() -> None:
    """Initialize structured logging."""
    log_level = logging.DEBUG if settings.DEBUG else logging.INFO

    formatter = logging.Formatter(
        fmt="%(asctime)s [%(levelname)s] %(name)s (%(filename)s:%(lineno)d) - %(message)s",
        datefmt="%Y-%m-%d %H:%M:%S",
    )

    handler = logging.StreamHandler(sys.stdout)
    handler.setFormatter(formatter)
    handler.addFilter(SecretScrubbingFilter())

    root_logger = logging.getLogger()
    root_logger.setLevel(log_level)

    # Avoid duplicate handlers if setup_logging is called multiple times
    if not any(isinstance(h, logging.StreamHandler) for h in root_logger.handlers):
        root_logger.addHandler(handler)

    # Adjust noisy third-party loggers
    logging.getLogger("uvicorn.access").setLevel(logging.WARNING)
    logging.getLogger("sqlalchemy.engine").setLevel(logging.WARNING)
