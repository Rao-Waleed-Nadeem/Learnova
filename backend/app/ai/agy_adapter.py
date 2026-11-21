"""Adapter interfacing with the local Antigravity Agent CLI (agy / agentapi)."""

import json
import logging
import os
import re
import shutil
import subprocess
import time
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

logger = logging.getLogger(__name__)

# Default brain base path on Windows / current system
DEFAULT_BRAIN_DIR = Path(os.environ.get("USERPROFILE", "C:/Users/PMYLS")) / ".gemini" / "antigravity" / "brain"
DEFAULT_BIN_DIR = Path(os.environ.get("USERPROFILE", "C:/Users/PMYLS")) / ".gemini" / "antigravity" / "bin"


class AgyCliAdapter:
    """Subprocess adapter executing agy / agentapi terminal commands and reading transcript logs."""

    def __init__(
        self,
        cli_command: Optional[str] = None,
        brain_dir: Optional[Path] = None,
        default_model: str = "flash",
        poll_timeout_seconds: float = 25.0,
    ):
        self.cli_command = cli_command or self._discover_cli()
        self.brain_dir = brain_dir or DEFAULT_BRAIN_DIR
        self.default_model = default_model
        self.poll_timeout_seconds = poll_timeout_seconds

    @staticmethod
    def _discover_cli() -> Any:
        """Locate agy or agentapi executable on system PATH or default directory."""
        # Direct language_server binary on Windows avoids cmd.exe argument newline splitting
        userprofile = Path(os.environ.get("USERPROFILE", "C:/Users/PMYLS"))
        localappdata = Path(os.environ.get("LOCALAPPDATA", str(userprofile / "AppData" / "Local")))
        direct_exe = localappdata / "Programs" / "antigravity" / "resources" / "bin" / "language_server.exe"
        if direct_exe.exists():
            return [str(direct_exe), "agentapi"]

        candidate_bat = DEFAULT_BIN_DIR / "agentapi.bat"
        if candidate_bat.exists():
            try:
                bat_text = candidate_bat.read_text(encoding="utf-8", errors="ignore")
                m = re.search(r'"([^"]+language_server\.exe)"', bat_text)
                if m and Path(m.group(1)).exists():
                    return [m.group(1), "agentapi"]
            except Exception:
                pass
            return str(candidate_bat)

        candidate_cmd = DEFAULT_BIN_DIR / "agy.cmd"
        if candidate_cmd.exists():
            return str(candidate_cmd)

        if shutil.which("agy"):
            return "agy"
        if shutil.which("agentapi"):
            return "agentapi"

        return "agentapi"

    def _build_cmd(self, subcmd: str) -> List[str]:
        if isinstance(self.cli_command, (list, tuple)):
            return list(self.cli_command) + [subcmd]
        return [str(self.cli_command), subcmd]

    def _should_use_shell(self) -> bool:
        cmd_parts = [self.cli_command] if isinstance(self.cli_command, str) else list(self.cli_command)
        first_part = str(cmd_parts[0]).lower()
        return first_part.endswith(".bat") or first_part.endswith(".cmd")

    def new_conversation(
        self,
        prompt: str,
        title: Optional[str] = None,
        model: Optional[str] = None,
    ) -> Optional[str]:
        """Start a new agent conversation via agy new-conversation and return the conversation_id."""
        cmd = self._build_cmd("new-conversation")
        chosen_model = model or self.default_model
        if chosen_model:
            cmd.append(f"--model={chosen_model}")
        if title:
            clean_title = re.sub(r'[\r\n"]', " ", title)[:80].strip()
            cmd.append(f'--title="{clean_title}"')
        cmd.append(prompt)

        try:
            logger.info("Starting AGY conversation with command: %s", " ".join(cmd[:3]))
            proc = subprocess.run(
                cmd,
                capture_output=True,
                text=True,
                shell=self._should_use_shell(),
                timeout=20,
            )
            if proc.returncode == 0 and proc.stdout:
                data = json.loads(proc.stdout)
                conv_id = data.get("response", {}).get("newConversation", {}).get("conversationId")
                if conv_id:
                    logger.info("Successfully initiated AGY conversation %s", conv_id)
                    return str(conv_id)
            logger.warning("agy new-conversation failed (%d): %s", proc.returncode, proc.stderr)
        except Exception as exc:
            logger.warning("Failed to invoke agy new-conversation: %s", exc)

        return None

    def send_message(
        self,
        conversation_id: str,
        content: str,
        title: Optional[str] = None,
    ) -> bool:
        """Send follow-up message into an existing conversation session."""
        cmd = self._build_cmd("send-message")
        if title:
            clean_title = re.sub(r'[\r\n"]', " ", title)[:80].strip()
            cmd.append(f'--title="{clean_title}"')
        cmd.extend([conversation_id, content])

        try:
            logger.info("Sending message to AGY conversation %s", conversation_id)
            proc = subprocess.run(
                cmd,
                capture_output=True,
                text=True,
                shell=self._should_use_shell(),
                timeout=15,
            )
            return proc.returncode == 0
        except Exception as exc:
            logger.warning("Failed to send message to agy conversation %s: %s", conversation_id, exc)
            return False

    def get_transcript_step_count(self, conversation_id: str) -> int:
        """Return the current number of recorded step lines in the conversation's transcript."""
        transcript_path = self.brain_dir / conversation_id / ".system_generated" / "logs" / "transcript.jsonl"
        if not transcript_path.exists():
            return 0
        try:
            lines = transcript_path.read_text(encoding="utf-8", errors="replace").strip().splitlines()
            return len(lines)
        except Exception as exc:
            logger.debug("Error reading transcript line count: %s", exc)
            return 0

    @staticmethod
    def _extract_text_from_record(
        record: Dict[str, Any],
        full_lines: Optional[List[str]] = None,
        idx: int = -1,
    ) -> Optional[str]:
        """Extract user-facing text from a MODEL transcript step (direct content or send_message tool call)."""
        # 1. Direct text content
        content = record.get("content")
        if "content" in record.get("truncated_fields", []) and full_lines and 0 <= idx < len(full_lines):
            try:
                full_rec = json.loads(full_lines[idx])
                content = full_rec.get("content") or content
            except Exception:
                pass
        if content and content.strip():
            return content.strip()

        # 2. Check tool_calls for send_message argument
        tool_calls = record.get("tool_calls") or []
        for tc in tool_calls:
            if isinstance(tc, dict) and tc.get("name") == "send_message":
                args = tc.get("args") or {}
                msg = args.get("Message") or args.get("message")
                if msg is not None:
                    raw_str = str(msg).strip()
                    if (raw_str.startswith('"') and raw_str.endswith('"')) or (
                        raw_str.startswith("'") and raw_str.endswith("'")
                    ):
                        try:
                            unpacked = json.loads(raw_str)
                            if isinstance(unpacked, str):
                                raw_str = unpacked
                            else:
                                raw_str = raw_str[1:-1]
                        except Exception:
                            raw_str = raw_str[1:-1]
                    if raw_str.strip():
                        return raw_str.strip()

        return None

    def wait_for_latest_response(
        self,
        conversation_id: str,
        previous_step_count: int = 0,
        timeout_seconds: Optional[float] = None,
    ) -> Tuple[Optional[str], int]:
        """Poll the conversation's transcript.jsonl strictly looking for new model responses."""
        timeout = timeout_seconds or self.poll_timeout_seconds
        transcript_path = self.brain_dir / conversation_id / ".system_generated" / "logs" / "transcript.jsonl"
        full_transcript_path = self.brain_dir / conversation_id / ".system_generated" / "logs" / "transcript_full.jsonl"
        start_time = time.time()

        last_content = None
        new_step_count = previous_step_count

        while time.time() - start_time < timeout:
            if transcript_path.exists():
                try:
                    lines = transcript_path.read_text(encoding="utf-8", errors="replace").strip().splitlines()
                    if len(lines) > previous_step_count:
                        new_step_count = len(lines)
                        full_lines = None
                        if full_transcript_path.exists():
                            try:
                                full_lines = full_transcript_path.read_text(
                                    encoding="utf-8", errors="replace"
                                ).strip().splitlines()
                            except Exception:
                                pass

                        # Scan backward ONLY down to previous_step_count to never accept stale previous turn responses
                        for idx in range(len(lines) - 1, previous_step_count - 1, -1):
                            line = lines[idx]
                            try:
                                record = json.loads(line)
                                if (
                                    record.get("source") == "MODEL"
                                    and record.get("status") == "DONE"
                                ):
                                    extracted = self._extract_text_from_record(record, full_lines, idx)
                                    if extracted:
                                        return extracted, new_step_count
                            except Exception:
                                continue
                except Exception as exc:
                    logger.debug("Error reading transcript: %s", exc)

            time.sleep(0.75)

        return last_content, new_step_count

    @staticmethod
    def extract_json_array(text: str) -> List[Dict[str, Any]]:
        """Extract JSON array from agent response text (handling code blocks or raw JSON)."""
        if not text:
            return []

        # Try regex search for ```json [...] ``` or ``` [...] ```
        match = re.search(r"```(?:json)?\s*(\[\s*\{.*?\}\s*\])\s*```", text, re.DOTALL)
        if match:
            try:
                parsed = json.loads(match.group(1))
                if isinstance(parsed, list):
                    return parsed
            except Exception:
                pass

        # Try finding standalone [ ... ]
        start = text.find("[")
        end = text.rfind("]")
        if start != -1 and end != -1 and end > start:
            try:
                parsed = json.loads(text[start : end + 1])
                if isinstance(parsed, list):
                    return parsed
            except Exception:
                pass

        return []
