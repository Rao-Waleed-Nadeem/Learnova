"""Standalone CLI Outbox Event Worker for Learnova.

Drains pending domain outbox events, applying row claiming, retry backoff,
dead-lettering, and idempotent dispatch to gamification and downstream subscribers.

Usage:
    python -m app.workers.outbox_worker --once --limit 50
    python -m app.workers.outbox_worker --interval 5
"""

import argparse
import logging
import sys
import time

from app.db.session import SessionLocal
from app.services.gamification_service import GamificationService

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger("outbox_worker")


def run_worker_batch(limit: int = 50) -> dict:
    """Execute a single batch pass of pending outbox events."""
    db = SessionLocal()
    try:
        result = GamificationService.process_pending_outbox_events(db, limit=limit)
        return result
    finally:
        db.close()


def main():
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

    logger.info("Outbox worker started (limit=%d, once=%s, interval=%.1fs)", args.limit, args.once, args.interval)

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
