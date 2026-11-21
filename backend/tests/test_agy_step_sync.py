"""Unit and regression tests verifying AGY step synchronization, transcript parsing, and adapter protocol."""

import json
from pathlib import Path
from unittest.mock import MagicMock, patch
import pytest

from app.ai.adapter import AIGenerateRequest, AISimplifyRequest, AgyServiceAdapter, ILLMServiceAdapter
from app.ai.agy_adapter import AgyCliAdapter


def test_agy_service_adapter_protocol_conformance():
    """Verify AgyServiceAdapter implements ILLMServiceAdapter protocol."""
    adapter = AgyServiceAdapter()
    assert isinstance(adapter, ILLMServiceAdapter)


def test_extract_text_from_record_direct_content():
    """Verify text is cleanly extracted from direct content in MODEL record."""
    record = {
        "source": "MODEL",
        "status": "DONE",
        "type": "PLANNER_RESPONSE",
        "content": "Here is the direct explanation of variables.",
    }
    extracted = AgyCliAdapter._extract_text_from_record(record)
    assert extracted == "Here is the direct explanation of variables."


def test_extract_text_from_record_send_message_tool_call():
    """Verify text is cleanly extracted from send_message tool call when content is empty."""
    record = {
        "source": "MODEL",
        "status": "DONE",
        "type": "PLANNER_RESPONSE",
        "content": "",
        "tool_calls": [
            {
                "name": "send_message",
                "args": {
                    "Message": '"This is the answer sent via send_message tool."',
                    "Recipient": "test-recipient",
                },
            }
        ],
    }
    extracted = AgyCliAdapter._extract_text_from_record(record)
    assert extracted == "This is the answer sent via send_message tool."


def test_extract_text_from_record_handles_json_encoded_tool_args():
    """Verify text enclosed in nested JSON string quotes is unescaped."""
    record = {
        "source": "MODEL",
        "status": "DONE",
        "type": "PLANNER_RESPONSE",
        "tool_calls": [
            {
                "name": "send_message",
                "args": {
                    "Message": json.dumps("A variable holds state in memory."),
                },
            }
        ],
    }
    extracted = AgyCliAdapter._extract_text_from_record(record)
    assert extracted == "A variable holds state in memory."


def test_wait_for_latest_response_strictly_ignores_stale_previous_steps(tmp_path: Path):
    """Verify wait_for_latest_response never returns stale turns when baseline previous_step_count is provided."""
    transcript_file = tmp_path / "transcript.jsonl"
    turn1_user = {"step_index": 0, "source": "USER_EXPLICIT", "content": "Turn 1 question"}
    turn1_model = {"step_index": 1, "source": "MODEL", "status": "DONE", "content": "Turn 1 answer"}

    transcript_file.write_text(
        f"{json.dumps(turn1_user)}\n{json.dumps(turn1_model)}\n",
        encoding="utf-8",
    )

    adapter = AgyCliAdapter(brain_dir=tmp_path.parent)
    # Mock transcript path to point to our test transcript
    conv_id = tmp_path.name
    target_dir = tmp_path.parent / conv_id / ".system_generated" / "logs"
    target_dir.mkdir(parents=True, exist_ok=True)
    (target_dir / "transcript.jsonl").write_text(
        f"{json.dumps(turn1_user)}\n{json.dumps(turn1_model)}\n",
        encoding="utf-8",
    )

    # 1. Baseline count is 2 (Turn 1). If no new lines exist, it should timeout and return None (NOT Turn 1 answer!)
    content, new_count = adapter.wait_for_latest_response(
        conversation_id=conv_id,
        previous_step_count=2,
        timeout_seconds=0.1,
    )
    assert content is None
    assert new_count == 2

    # 2. Append Turn 2
    turn2_user = {"step_index": 2, "source": "SYSTEM", "content": "Turn 2 question"}
    turn2_model = {"step_index": 3, "source": "MODEL", "status": "DONE", "content": "Turn 2 fresh answer"}
    with open(target_dir / "transcript.jsonl", "a", encoding="utf-8") as f:
        f.write(f"{json.dumps(turn2_user)}\n{json.dumps(turn2_model)}\n")

    # 3. Now wait_for_latest_response with baseline=2 picks up Turn 2 fresh answer!
    content_turn2, count_turn2 = adapter.wait_for_latest_response(
        conversation_id=conv_id,
        previous_step_count=2,
        timeout_seconds=1.0,
    )
    assert content_turn2 == "Turn 2 fresh answer"
    assert count_turn2 == 4
