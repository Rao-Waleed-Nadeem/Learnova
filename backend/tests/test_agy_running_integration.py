"""Live running test for AGY terminal CLI execution and conversation handling."""

import json
import pytest
from app.ai.agy_adapter import AgyCliAdapter


def test_agy_cli_discovery_and_running_command():
    """Verify that agy / agentapi CLI is discoverable and responds to system calls."""
    adapter = AgyCliAdapter()
    assert adapter.cli_command is not None
    cmd_str = " ".join(adapter.cli_command) if isinstance(adapter.cli_command, list) else str(adapter.cli_command)
    assert "agentapi" in cmd_str.lower() or "agy" in cmd_str.lower()


def test_agy_live_new_conversation_execution():
    """Verify live agy new-conversation starts an agent conversation and returns valid conversation ID."""
    adapter = AgyCliAdapter()
    conv_id = adapter.new_conversation(
        prompt="Acknowledge this test prompt and respond with: Ready",
        title="Learnova Live Test",
        model="flash",
    )
    # If the local language server daemon is active, conv_id is returned
    assert conv_id is not None
    assert len(conv_id) == 36  # Standard UUID length
