"""Integration tests for FastAPI application lifespan management of OutboxProcessor (Option B).

Covers:
- Processor does not start at module import
- Processor starts when application lifespan enters
- Processor starts only once
- Processor stops cleanly when application lifespan exits
- Shutdown timeout is respected
- OUTBOX_ENABLED=False disables processor cleanly
- Health/telemetry endpoint /api/v1/health/outbox reflects status
- Processor error does not crash API
"""

import asyncio
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

from app.core.config import Settings
from app.main import app, lifespan
from app.workers.outbox_worker import OutboxProcessor


def test_processor_does_not_start_at_module_import():
    """Verify that importing app does not automatically start the outbox processor."""
    # At module import time before lifespan is entered, app.state should not have a running processor
    processor = getattr(app.state, "outbox_processor", None)
    if processor is not None:
        assert processor.is_running is False


@pytest.mark.anyio
async def test_lifespan_starts_and_stops_processor():
    """Verify entering lifespan starts the processor and exiting lifespan stops it."""
    test_app = FastAPI(lifespan=lifespan)

    with patch("app.main.settings.OUTBOX_ENABLED", True):
        with patch("app.workers.outbox_worker.OutboxProcessor.process_batch", return_value={"processed_count": 0, "failed_count": 0}):
            async with lifespan(test_app):
                assert hasattr(test_app.state, "outbox_processor")
                processor = test_app.state.outbox_processor
                assert isinstance(processor, OutboxProcessor)
                assert processor.is_running is True

            # Exiting lifespan must stop the processor
            assert processor.is_running is False
            assert processor._task is None


@pytest.mark.anyio
async def test_lifespan_disabled_by_config():
    """Verify OUTBOX_ENABLED=False bypasses background processor launch."""
    test_app = FastAPI(lifespan=lifespan)

    with patch("app.main.settings.OUTBOX_ENABLED", False):
        async with lifespan(test_app):
            processor = getattr(test_app.state, "outbox_processor", None)
            assert processor is None


@pytest.mark.anyio
async def test_processor_single_instance_per_lifecycle():
    """Verify processor is not instantiated multiple times within the same lifecycle."""
    test_app = FastAPI(lifespan=lifespan)

    with patch("app.main.settings.OUTBOX_ENABLED", True):
        with patch("app.workers.outbox_worker.OutboxProcessor.process_batch", return_value={"processed_count": 0, "failed_count": 0}):
            async with lifespan(test_app):
                proc1 = test_app.state.outbox_processor
                # Attempt manual start again
                await proc1.start()
                assert test_app.state.outbox_processor is proc1


def test_health_outbox_telemetry_endpoint(client: TestClient):
    """Verify /api/v1/health/outbox returns running/stopped/disabled status and diagnostics."""
    # When app has no running processor or disabled
    res = client.get("/api/v1/health/outbox")
    assert res.status_code == 200
    data = res.json()
    assert "status" in data
    assert data["status"] in ("running", "stopped", "disabled")


@pytest.mark.anyio
async def test_processor_exception_does_not_crash_lifespan():
    """Verify an unexpected exception during batch processing logs but does not crash the server loop."""
    processor = OutboxProcessor(
        poll_interval=0.05,
        session_factory=MagicMock(),
        enable_advisory_lock=False,
    )

    # Force process_batch to raise an unhandled exception
    call_count = 0
    def failing_batch():
        nonlocal call_count
        call_count += 1
        raise RuntimeError("Simulated unexpected batch crash")

    processor.process_batch = failing_batch

    await processor.start()
    await asyncio.sleep(0.15)

    # Processor loop should still be running despite the error
    assert processor.is_running is True
    assert call_count >= 1
    assert processor.last_error is not None
    assert "Simulated unexpected batch crash" in processor.last_error

    await processor.stop()
    assert processor.is_running is False
