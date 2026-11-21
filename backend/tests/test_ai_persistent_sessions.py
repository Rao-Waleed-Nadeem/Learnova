"""Unit and running tests for AGY persistent sessions, context templates, and attachments."""

import uuid
from pathlib import Path
from unittest.mock import MagicMock, patch
import pytest
from sqlalchemy.orm import Session

from app.ai.agy_adapter import AgyCliAdapter
from app.models.ai import AICandidateQuestion, AISession, AISessionMessage
from app.models.course import Course
from app.models.role import Role
from app.models.user import User
from app.schemas.ai import AIAttachmentItem, AISendSessionMessageRequest, AISessionCreateRequest
from app.services.ai_session_service import AISessionService


def test_agy_adapter_extract_json_array():
    """Verify AgyCliAdapter correctly extracts question JSON arrays from markdown and raw text."""
    # 1. Markdown code block
    md_text = (
        "Here are your candidate questions:\n\n"
        "```json\n"
        "[\n"
        "  {\n"
        '    "prompt": "What is an invariant?",\n'
        '    "type": "multiple_choice",\n'
        '    "difficulty": "medium",\n'
        '    "points": 2,\n'
        '    "options": [\n'
        '      { "id": "1", "text": "A condition that remains true", "isCorrect": true },\n'
        '      { "id": "2", "text": "A mutable register", "isCorrect": false }\n'
        "    ]\n"
        "  }\n"
        "]\n"
        "```\n"
        "Hope this helps!"
    )
    extracted = AgyCliAdapter.extract_json_array(md_text)
    assert len(extracted) == 1
    assert extracted[0]["prompt"] == "What is an invariant?"
    assert extracted[0]["type"] == "multiple_choice"

    # 2. Raw JSON array without fences
    raw_text = '[{"prompt": "Is memory finite?", "type": "true_false", "correctBool": true}]'
    extracted_raw = AgyCliAdapter.extract_json_array(raw_text)
    assert len(extracted_raw) == 1
    assert extracted_raw[0]["correctBool"] is True

    # 3. Empty or invalid text
    assert AgyCliAdapter.extract_json_array("No questions here.") == []
    assert AgyCliAdapter.extract_json_array("") == []


def test_master_prompt_templates_exist_and_contain_rules():
    """Verify generate_question.md and simplification.md master instruction templates exist with required sections."""
    prompts_dir = Path(__file__).resolve().parent.parent / "app" / "ai" / "prompts"
    gen_q_file = prompts_dir / "generate_question.md"
    simp_file = prompts_dir / "simplification.md"

    assert gen_q_file.exists(), "generate_question.md master template must exist"
    assert simp_file.exists(), "simplification.md master template must exist"

    gen_q_text = gen_q_file.read_text(encoding="utf-8")
    assert "multiple_choice" in gen_q_text
    assert "true_false" in gen_q_text
    assert "fill_blank" in gen_q_text
    assert "matching" in gen_q_text
    assert "short_answer" in gen_q_text
    assert "question generator" in gen_q_text.lower()
    assert "json" in gen_q_text.lower()
    assert "anti-hallucination" in gen_q_text.lower() or "not invent" in gen_q_text.lower()

    simp_text = simp_file.read_text(encoding="utf-8")
    assert "attached_resources" in simp_text or "attachment" in simp_text.lower()
    assert "simplify" in simp_text
    assert "analogy" in simp_text
    assert "example" in simp_text

    # Also test AISessionService fallback loading
    loaded_gen_q = AISessionService._read_prompt_template("generate_question.md")
    loaded_simp = AISessionService._read_prompt_template("simplification.md")
    assert len(loaded_gen_q) > 500
    assert len(loaded_simp) > 500


def test_ai_session_model_and_relationship_structure():
    """Verify AISession and AISessionMessage schema definitions and defaults."""
    sess_id = uuid.uuid4()
    user_id = uuid.uuid4()
    course_id = uuid.uuid4()

    session = AISession(
        id=sess_id,
        session_type="question_generation",
        user_id=user_id,
        course_id=course_id,
        agy_conversation_id="conv-12345",
        title="Test Session",
        context_snapshot={"topic": "Binary Search"},
        status="active",
    )
    assert session.session_type == "question_generation"
    assert session.status == "active"
    assert session.agy_conversation_id == "conv-12345"

    msg = AISessionMessage(
        session_id=sess_id,
        sender="user",
        content="Make question 1 harder",
        attachments=[{"title": "search.py", "type": "code"}],
        raw_metadata={"mode": "refine_questions"},
    )
    assert msg.sender == "user"
    assert len(msg.attachments) == 1
    assert msg.attachments[0]["title"] == "search.py"


def test_session_service_reuses_active_session():
    """Verify get_or_create_session reuses an existing active session without spawning duplicates."""
    db = MagicMock(spec=Session)

    teacher_role = Role(name="teacher")
    teacher = User(id=uuid.uuid4(), email="prof@learnova.edu", role=teacher_role)
    course_id = uuid.uuid4()

    mock_course = Course(id=course_id, title="Algorithms", creator_id=teacher.id)
    db.get.return_value = mock_course

    existing_session = AISession(
        id=uuid.uuid4(),
        session_type="question_generation",
        user_id=teacher.id,
        course_id=course_id,
        agy_conversation_id="existing-conv-id",
        title="Existing Session",
        status="active",
    )

    query_mock = db.query.return_value
    filter_mock = query_mock.filter.return_value
    filter_mock.first.return_value = existing_session

    req = AISessionCreateRequest(
        session_type="question_generation",
        course_id=course_id,
        title="New Attempted Session",
    )

    result = AISessionService.get_or_create_session(db=db, req=req, actor=teacher)
    assert result.id == existing_session.id
    assert result.agy_conversation_id == "existing-conv-id"


def test_send_message_with_attachments_and_question_extraction():
    """Verify sending message with attachments formats prompt and saves user/agent messages and candidates."""
    db = MagicMock(spec=Session)

    teacher_role = Role(name="teacher")
    teacher = User(id=uuid.uuid4(), email="teacher@learnova.edu", role=teacher_role)
    course_id = uuid.uuid4()
    topic_id = uuid.uuid4()

    session = AISession(
        id=uuid.uuid4(),
        session_type="question_generation",
        user_id=teacher.id,
        course_id=course_id,
        topic_id=topic_id,
        agy_conversation_id="conv-persistent-test",
        title="Question Generation: Trees",
        context_snapshot={"topic_title": "Trees"},
        status="active",
    )
    db.get.return_value = session

    # Mock AGY CLI adapter
    mock_agy = MagicMock(spec=AgyCliAdapter)
    mock_agy.send_message.return_value = True
    agent_response_text = (
        "Here is the refined question:\n"
        "```json\n"
        "[\n"
        "  {\n"
        '    "prompt": "What is the max height of an AVL tree with n nodes?",\n'
        '    "type": "multiple_choice",\n'
        '    "difficulty": "hard",\n'
        '    "points": 3,\n'
        '    "options": [\n'
        '      { "id": "1", "text": "O(log n)", "isCorrect": true },\n'
        '      { "id": "2", "text": "O(n)", "isCorrect": false }\n'
        "    ],\n"
        '    "explanation": "AVL trees maintain strict balance factor guarantees."\n'
        "  }\n"
        "]\n"
        "```"
    )
    mock_agy.wait_for_latest_response.return_value = (agent_response_text, 2)
    AISessionService.set_adapter(mock_agy)

    req = AISendSessionMessageRequest(
        content="Add a hard question about AVL tree height",
        mode="refine_questions",
        attachments=[
            AIAttachmentItem(
                title="avl_tree.py",
                type="code",
                content="class AVLNode: ...",
            )
        ],
    )

    user_msg, agent_msg = AISessionService.send_message(
        db=db,
        session_id=session.id,
        req=req,
        actor=teacher,
    )

    # 1. Verify user message
    assert user_msg.sender == "user"
    assert "AVL tree height" in user_msg.content
    assert len(user_msg.attachments) == 1
    assert user_msg.attachments[0]["title"] == "avl_tree.py"

    # 2. Verify agent message
    assert agent_msg.sender == "agent"
    assert "AVL tree with n nodes" in agent_msg.content

    # 3. Verify AGY adapter was called with attachment block
    assert mock_agy.send_message.called
    sent_prompt = mock_agy.send_message.call_args[0][1]
    assert "<attached_resources>" in sent_prompt
    assert "avl_tree.py" in sent_prompt

    # 4. Verify candidate question was added to session
    assert db.add.called
    assert db.commit.called


def test_tutoring_mode_worked_example_and_analogy():
    """Verify student tutoring modes generate structured educational responses."""
    db = MagicMock(spec=Session)

    student_role = Role(name="student")
    student = User(id=uuid.uuid4(), email="student@learnova.edu", role=student_role)
    course_id = uuid.uuid4()
    lesson_id = uuid.uuid4()

    session = AISession(
        id=uuid.uuid4(),
        session_type="lesson_tutoring",
        user_id=student.id,
        course_id=course_id,
        lesson_id=lesson_id,
        agy_conversation_id="conv-tutoring-test",
        title="Tutoring: Recursion",
        context_snapshot={"lesson_title": "Recursion"},
        status="active",
    )
    db.get.return_value = session

    # Test deterministic fallback for worked example
    mock_agy = MagicMock(spec=AgyCliAdapter)
    mock_agy.send_message.return_value = True
    mock_agy.wait_for_latest_response.return_value = (None, 0)  # triggers curriculum fallback
    AISessionService.set_adapter(mock_agy)

    req_example = AISendSessionMessageRequest(
        content="Show me an example of recursion",
        mode="example",
        attachments=[],
    )

    _, agent_msg = AISessionService.send_message(
        db=db,
        session_id=session.id,
        req=req_example,
        actor=student,
    )

    assert agent_msg.sender == "agent"
    assert "Worked Example: Recursion" in agent_msg.content
    assert "```python" in agent_msg.content


def test_agy_adapter_transcript_filtering_and_shell_resolution(tmp_path):
    """Verify wait_for_latest_response ignores tool outputs and resolves true PLANNER_RESPONSE."""
    import json
    conv_id = "test-conv-filter"
    logs_dir = tmp_path / conv_id / ".system_generated" / "logs"
    logs_dir.mkdir(parents=True, exist_ok=True)
    transcript_file = logs_dir / "transcript.jsonl"
    transcript_full_file = logs_dir / "transcript_full.jsonl"

    adapter = AgyCliAdapter(cli_command="test-cli", brain_dir=tmp_path)
    assert adapter._should_use_shell() is False

    bat_adapter = AgyCliAdapter(cli_command="C:/agentapi.bat", brain_dir=tmp_path)
    assert bat_adapter._should_use_shell() is True

    # 1. Step 1 is tool call (MODEL, PLANNER_RESPONSE with tool_calls)
    step1 = {
        "step_index": 1,
        "source": "MODEL",
        "type": "PLANNER_RESPONSE",
        "status": "DONE",
        "tool_calls": [{"name": "run_command", "args": {}}],
    }
    # 2. Step 2 is tool output (MODEL, GENERIC)
    step2 = {
        "step_index": 2,
        "source": "MODEL",
        "type": "GENERIC",
        "status": "DONE",
        "content": "Directory of C:\\files\ncontent.md",
    }
    # 3. Step 3 is final assistant reply with truncated content
    step3_compact = {
        "step_index": 3,
        "source": "MODEL",
        "type": "PLANNER_RESPONSE",
        "status": "DONE",
        "content": "Short preview...",
        "truncated_fields": ["content"],
    }
    step3_full = {
        "step_index": 3,
        "source": "MODEL",
        "type": "PLANNER_RESPONSE",
        "status": "DONE",
        "content": "Full pedagogical tutoring response explaining short-circuiting in depth.",
    }

    transcript_file.write_text(
        "\n".join([json.dumps(step1), json.dumps(step2), json.dumps(step3_compact)]),
        encoding="utf-8",
    )
    transcript_full_file.write_text(
        "\n".join([json.dumps(step1), json.dumps(step2), json.dumps(step3_full)]),
        encoding="utf-8",
    )

    resp, count = adapter.wait_for_latest_response(conv_id, previous_step_count=0, timeout_seconds=1)
    assert resp == "Full pedagogical tutoring response explaining short-circuiting in depth."
    assert count == 3

