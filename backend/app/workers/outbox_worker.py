"""In-Process and Standalone Durable Domain Outbox Event Processor for Learnova (Option B).

Implements in-process background event processing integrated into the FastAPI application lifespan,
providing:
- Asynchronous non-blocking polling using background thread offloading (`asyncio.to_thread`).
- Immediate interruptible shutdown via `asyncio.Event`.
- Concurrency safety with PostgreSQL `FOR UPDATE SKIP LOCKED`.
- Optional multi-instance coordination via PostgreSQL session advisory lock.
- Bounded batch draining and exponential backoff with jitter.
- Idempotent reward attribution preventing duplicate XP.
- Health diagnostics and structured logging.
"""

import argparse
import asyncio
from datetime import datetime, timezone
import logging
import sys
import time
from typing import Any, Callable, Dict, Optional

from sqlalchemy import text
from sqlalchemy.orm import Session

from app.core.config import settings
from app.db.session import SessionLocal, engine
from app.services.gamification_service import GamificationService

logger = logging.getLogger("learnova.outbox_processor")

OUTBOX_ADVISORY_LOCK_ID = 742918  # Stable 32-bit application key for Learnova outbox leader election


class OutboxProcessor:
    """In-process background processor executing durable outbox event dispatching."""

    def __init__(
        self,
        session_factory: Optional[Callable[[], Session]] = None,
        poll_interval: float = 5.0,
        batch_size: int = 20,
        max_attempts: int = 5,
        retry_base_seconds: float = 5.0,
        retry_max_seconds: float = 300.0,
        shutdown_timeout: float = 30.0,
        enable_advisory_lock: bool = True,
    ):
        self.session_factory = session_factory or SessionLocal
        self.poll_interval = max(0.1, float(poll_interval))
        self.batch_size = max(1, int(batch_size))
        self.max_attempts = max(1, int(max_attempts))
        self.retry_base_seconds = max(0.1, float(retry_base_seconds))
        self.retry_max_seconds = max(self.retry_base_seconds, float(retry_max_seconds))
        self.shutdown_timeout = max(1.0, float(shutdown_timeout))
        self.enable_advisory_lock = enable_advisory_lock

        self._task: Optional[asyncio.Task] = None
        self._stop_event: asyncio.Event = asyncio.Event()
        self._is_running: bool = False
        self._is_leader: bool = False
        self._advisory_conn: Optional[Any] = None

        # Telemetry
        self._last_poll_time: Optional[datetime] = None
        self._last_error: Optional[str] = None
        self._processed_total: int = 0
        self._failed_total: int = 0

    @property
    def is_running(self) -> bool:
        return self._is_running

    @property
    def is_leader(self) -> bool:
        return self._is_leader

    @property
    def last_poll_time(self) -> Optional[datetime]:
        return self._last_poll_time

    @property
    def last_error(self) -> Optional[str]:
        return self._last_error

    @property
    def processed_total(self) -> int:
        return self._processed_total

    @property
    def failed_total(self) -> int:
        return self._failed_total

    def get_diagnostics(self) -> Dict[str, Any]:
        """Return safe, non-sensitive operational telemetry."""
        return {
            "is_running": self._is_running,
            "is_leader": self._is_leader,
            "poll_interval_seconds": self.poll_interval,
            "batch_size": self.batch_size,
            "max_attempts": self.max_attempts,
            "last_poll_time": self._last_poll_time.isoformat() if self._last_poll_time else None,
            "last_error": self._last_error,
            "processed_total": self._processed_total,
            "failed_total": self._failed_total,
        }

    async def start(self) -> None:
        """Start the background polling loop. Must be called from inside an async loop (e.g. lifespan)."""
        if self._is_running:
            logger.warning("OutboxProcessor is already running.")
            return

        self._stop_event.clear()
        self._is_running = True
        self._task = asyncio.create_task(self.run_forever(), name="learnova_outbox_processor")
        logger.info(
            "OutboxProcessor started (interval=%.1fs, batch_size=%d, max_attempts=%d)",
            self.poll_interval,
            self.batch_size,
            self.max_attempts,
        )

    async def stop(self) -> None:
        """Gracefully stop the background processor within configured shutdown timeout."""
        if not self._is_running:
            return

        logger.info("OutboxProcessor stopping...")
        self._stop_event.set()
        self._is_running = False

        if self._task:
            try:
                await asyncio.wait_for(asyncio.shield(self._task), timeout=self.shutdown_timeout)
            except asyncio.TimeoutError:
                logger.warning(
                    "OutboxProcessor shutdown exceeded timeout (%ss); cancelling task.",
                    self.shutdown_timeout,
                )
                self._task.cancel()
                try:
                    await self._task
                except asyncio.CancelledError:
                    pass
            except Exception as exc:
                logger.error("Error during OutboxProcessor shutdown: %s", exc)
            finally:
                self._task = None

        # Release advisory lock if held
        self._release_advisory_lock()
        logger.info("OutboxProcessor stopped successfully.")

    def _acquire_advisory_lock(self) -> bool:
        """Attempt to acquire session-level PostgreSQL advisory lock for leader election."""
        if not self.enable_advisory_lock:
            self._is_leader = True
            return True

        try:
            if self._advisory_conn is None:
                self._advisory_conn = engine.connect()

            # Verify PostgreSQL dialect
            if self._advisory_conn.dialect.name != "postgresql":
                self._is_leader = True
                return True

            res = self._advisory_conn.execute(
                text("SELECT pg_try_advisory_lock(:lock_id)"),
                {"lock_id": OUTBOX_ADVISORY_LOCK_ID},
            ).scalar()

            self._is_leader = bool(res)
            return self._is_leader
        except Exception as exc:
            logger.warning("Advisory lock acquisition check failed: %s", exc)
            self._release_advisory_lock()
            self._is_leader = True  # Fall back to FOR UPDATE SKIP LOCKED
            return True

    def _release_advisory_lock(self) -> None:
        """Release session-level PostgreSQL advisory lock and dispose connection."""
        try:
            if self._advisory_conn:
                try:
                    if self._is_leader and getattr(self._advisory_conn, "dialect", None) and self._advisory_conn.dialect.name == "postgresql":
                        self._advisory_conn.execute(
                            text("SELECT pg_advisory_unlock(:lock_id)"),
                            {"lock_id": OUTBOX_ADVISORY_LOCK_ID},
                        )
                except Exception as exc:
                    logger.debug("Advisory lock release notice: %s", exc)
                finally:
                    try:
                        self._advisory_conn.close()
                    except Exception:
                        pass
                    self._advisory_conn = None
        finally:
            self._is_leader = False

    def process_batch(self, limit: Optional[int] = None) -> Dict[str, Any]:
        """Synchronously execute a single batch pass of pending outbox events."""
        db: Session = self.session_factory()
        effective_limit = limit or self.batch_size
        try:
            result = GamificationService.process_pending_outbox_events(
                db=db,
                limit=effective_limit,
                max_attempts=self.max_attempts,
                retry_base_seconds=self.retry_base_seconds,
                retry_max_seconds=self.retry_max_seconds,
            )
            self._last_poll_time = datetime.now(timezone.utc)
            self._last_error = None
            self._processed_total += result.get("processed_count", 0)
            self._failed_total += result.get("failed_count", 0)
            return result
        except Exception as exc:
            self._last_error = str(exc)[:500]
            logger.error("OutboxProcessor batch execution error: %s", exc)
            raise
        finally:
            db.close()

    async def run_forever(self) -> None:
        """Infinite polling loop running in the background until stop_event is set."""
        while not self._stop_event.is_set():
            # Check or acquire leadership
            has_lock = self._acquire_advisory_lock()
            if not has_lock:
                logger.debug("Another outbox processor instance holds the lock. Standing by...")
            else:
                try:
                    # Offload synchronous database batch to thread pool to preserve event loop responsiveness
                    res = await asyncio.to_thread(self.process_batch)
                    processed = res.get("processed_count", 0)
                    failed = res.get("failed_count", 0)
                    if processed > 0 or failed > 0:
                        logger.info("Outbox batch completed: %s", res.get("message"))
                except Exception as exc:
                    self._last_error = str(exc)
                    logger.warning("Recoverable error in outbox polling cycle: %s", exc)

            # Interruptible sleep: wake up immediately when stop_event is set
            try:
                await asyncio.wait_for(self._stop_event.wait(), timeout=self.poll_interval)
            except asyncio.TimeoutError:
                pass


def create_outbox_processor(
    session_factory: Optional[Callable[[], Session]] = None,
    poll_interval: Optional[float] = None,
    batch_size: Optional[int] = None,
    max_attempts: Optional[int] = None,
    retry_base_seconds: Optional[float] = None,
    retry_max_seconds: Optional[float] = None,
    shutdown_timeout: Optional[float] = None,
    enable_advisory_lock: Optional[bool] = None,
) -> OutboxProcessor:
    """Factory creating an OutboxProcessor configured from app settings."""
    return OutboxProcessor(
        session_factory=session_factory or SessionLocal,
        poll_interval=poll_interval if poll_interval is not None else settings.OUTBOX_POLL_INTERVAL_SECONDS,
        batch_size=batch_size if batch_size is not None else settings.OUTBOX_BATCH_SIZE,
        max_attempts=max_attempts if max_attempts is not None else settings.OUTBOX_MAX_ATTEMPTS,
        retry_base_seconds=retry_base_seconds if retry_base_seconds is not None else settings.OUTBOX_RETRY_BASE_SECONDS,
        retry_max_seconds=retry_max_seconds if retry_max_seconds is not None else settings.OUTBOX_RETRY_MAX_SECONDS,
        shutdown_timeout=shutdown_timeout if shutdown_timeout is not None else settings.OUTBOX_SHUTDOWN_TIMEOUT_SECONDS,
        enable_advisory_lock=enable_advisory_lock if enable_advisory_lock is not None else settings.OUTBOX_ENABLE_ADVISORY_LOCK,
    )


def run_worker_batch(limit: int = 50) -> dict:
    """Execute a single batch pass of pending outbox events (standalone helper)."""
    processor = create_outbox_processor(batch_size=limit)
    return processor.process_batch(limit=limit)


def main():
    """CLI entrypoint for standalone worker execution."""
    parser = argparse.ArgumentParser(description="Learnova Outbox Event Worker")
    parser.add_argument(
        "--once",
        action="store_true",
        help="Run a single batch and exit immediately.",
    )
    parser.add_argument(
        "--limit",
        type=int,
        default=50,
        help="Maximum events to drain per batch (default: 50).",
    )
    parser.add_argument(
        "--interval",
        type=float,
        default=5.0,
        help="Seconds to sleep between batch loops in continuous mode (default: 5.0).",
    )
    args = parser.parse_args()

    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    )
    logger.info("Outbox worker CLI started (limit=%d, once=%s, interval=%.1fs)", args.limit, args.once, args.interval)

    if args.once:
        res = run_worker_batch(limit=args.limit)
        logger.info("Batch finished: %s", res["message"])
        sys.exit(0)

    try:
        while True:
            res = run_worker_batch(limit=args.limit)
            if res.get("processed_count", 0) > 0 or res.get("failed_count", 0) > 0:
                logger.info("Batch finished: %s", res["message"])
            time.sleep(args.interval)
    except KeyboardInterrupt:
        logger.info("Outbox worker shutting down gracefully...")
        sys.exit(0)


if __name__ == "__main__":
    main()
