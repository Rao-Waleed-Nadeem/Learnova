"""Domain service managing persistent AI sessions, AGY terminal agent execution, and chat history."""

import json
import logging
import uuid
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple
from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.ai.adapter import CandidateQuestionDraft, GeminiServiceAdapter
from app.ai.agy_adapter import AgyCliAdapter
from app.core.config import settings
from app.core.sanitizer import scrub_pii
from app.models.ai import AICandidateQuestion, AISession, AISessionMessage
from app.models.course import Course
from app.models.enrollment import Enrollment
from app.models.lesson import Lesson
from app.models.resource import LearningResource
from app.models.topic import Topic
from app.models.user import User
from app.schemas.ai import AISendSessionMessageRequest, AISessionCreateRequest
from app.services.audit_service import log_audit_event
from app.services.question_service import QuestionService

logger = logging.getLogger(__name__)

PROMPTS_DIR = Path(__file__).resolve().parent.parent / "ai" / "prompts"


class AISessionService:
    """Service governing persistent sessions, AGY CLI agent orchestration, and context presaving."""

    _adapter: Optional[AgyCliAdapter] = None

    @classmethod
    def get_adapter(cls) -> AgyCliAdapter:
        if cls._adapter is None:
            cls._adapter = AgyCliAdapter(default_model="flash")
        return cls._adapter

    @classmethod
    def set_adapter(cls, adapter: AgyCliAdapter) -> None:
        cls._adapter = adapter

    @staticmethod
    def _read_prompt_template(filename: str) -> str:
        """Read master context prompt markdown file with backward-compatible fallback."""
        candidates = [filename]
        if filename in ("generate_question.md", "context.md"):
            candidates = ["generate_question.md", "context.md"]
        elif filename in ("simplification.md", "content.md"):
            candidates = ["simplification.md", "content.md"]

        for cand in candidates:
            file_path = PROMPTS_DIR / cand
            if file_path.exists():
                try:
                    return file_path.read_text(encoding="utf-8")
                except Exception as exc:
                    logger.warning("Error reading %s: %s", cand, exc)
        return ""

    @staticmethod
    def get_or_create_session(
        db: Session,
        req: AISessionCreateRequest,
        actor: User,
    ) -> AISession:
        """Retrieve existing active persistent session or initialize a new one with presaved context."""
        actor_role = actor.role.name if (actor.role and actor.role.name) else "student"

        # 1. Authorize course access
        course = db.get(Course, req.course_id)
        if not course:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Course not found")

        if req.session_type == "question_generation":
            if actor_role not in ("teacher", "administrator"):
                raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only teachers can generate questions")
            QuestionService.verify_course_teacher_access(db, course.id, actor)
        elif req.session_type == "lesson_tutoring":
            if actor_role == "student":
                enr = (
                    db.query(Enrollment)
                    .filter(
                        Enrollment.student_id == actor.id,
                        Enrollment.course_id == course.id,
                        Enrollment.status == "active",
                    )
                    .first()
                )
                if not enr:
                    raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Must be enrolled in course")

        # 2. Check for existing active session
        query = db.query(AISession).filter(
            AISession.user_id == actor.id,
            AISession.session_type == req.session_type,
            AISession.course_id == req.course_id,
            AISession.status == "active",
        )
        if req.topic_id:
            query = query.filter(AISession.topic_id == req.topic_id)
        if req.lesson_id:
            query = query.filter(AISession.lesson_id == req.lesson_id)

        existing_session = query.first()
        if existing_session:
            return existing_session

        # 3. Resolve context titles and syllabus information
        topic = db.get(Topic, req.topic_id) if req.topic_id else None
        lesson = db.get(Lesson, req.lesson_id) if req.lesson_id else None

        topic_title = topic.title if topic else "General Topic"
        lesson_title = lesson.title if lesson else "General Lesson"
        course_title = course.title

        # 4. Presave context and load master instruction templates
        if req.session_type == "question_generation":
            session_title = req.title or f"Question Generation: {topic_title}"
            master_instructions = AISessionService._read_prompt_template("generate_question.md")
            init_prompt = (
                f"{master_instructions}\n\n"
                f"<curriculum_context>\n"
                f"Course: {course_title}\n"
                f"Topic: {topic_title}\n"
                f"Topic Description: {topic.description if topic else ''}\n"
                f"</curriculum_context>\n\n"
                "Session initialized. Awaiting teacher question generation instructions."
            )
        else:
            session_title = req.title or f"Tutoring: {lesson_title}"
            master_instructions = AISessionService._read_prompt_template("simplification.md")
            lesson_desc = lesson.description if lesson else ""
            init_prompt = (
                f"{master_instructions}\n\n"
                f"<curriculum_context>\n"
                f"Course: {course_title}\n"
                f"Topic: {topic_title}\n"
                f"Lesson: {lesson_title}\n"
                f"Lesson Summary: {lesson_desc}\n"
                f"</curriculum_context>\n\n"
                "Session initialized. Awaiting student questions."
            )

        # 5. Initiate persistent AGY conversation
        adapter = AISessionService.get_adapter()
        agy_conv_id = adapter.new_conversation(
            prompt=init_prompt,
            title=f"Learnova - {session_title}",
            model="flash",
        )

        context_snapshot = {
            "course_title": course_title,
            "topic_title": topic_title,
            "lesson_title": lesson_title,
            "session_type": req.session_type,
            "master_template_used": "generate_question.md" if req.session_type == "question_generation" else "simplification.md",
        }

        new_session = AISession(
            session_type=req.session_type,
            user_id=actor.id,
            course_id=req.course_id,
            topic_id=req.topic_id,
            lesson_id=req.lesson_id,
            agy_conversation_id=agy_conv_id,
            title=session_title,
            context_snapshot=context_snapshot,
            status="active",
        )
        db.add(new_session)
        db.commit()
        db.refresh(new_session)

        # 6. Add initial greeting message
        welcome_text = (
            f"Hello! I am your AI Assistant for **{lesson_title}** in *{course_title}*.\n"
            "You can ask questions, request an analogy or worked code example, or attach any of the lesson resources below to explore together."
            if req.session_type == "lesson_tutoring"
            else f"Question Generation Session ready for **{topic_title}** (*{course_title}*). What kind of assessment questions would you like to create?"
        )
        welcome_msg = AISessionMessage(
            session_id=new_session.id,
            sender="agent",
            content=welcome_text,
            attachments=[],
            raw_metadata={"is_welcome": True},
        )
        db.add(welcome_msg)
        db.commit()

        return new_session

    @staticmethod
    def send_message(
        db: Session,
        session_id: UUID,
        req: AISendSessionMessageRequest,
        actor: User,
    ) -> Tuple[AISessionMessage, AISessionMessage]:
        """Send student/teacher message, attach resources, execute AGY terminal agent, and persist responses."""
        session = db.get(AISession, session_id)
        if not session:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="AI session not found")

        # Verify access
        if session.user_id != actor.id and actor.role.name not in ("administrator", "teacher"):
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied to session")

        # 1. Scrub PII from input
        clean_content = scrub_pii(req.content)

        # 2. Serialize user attachments
        attachments_data = []
        attachment_context_snippets = []
        if req.attachments:
            for att in req.attachments:
                att_dict = att.model_dump()
                attachments_data.append(att_dict)
                if att.content:
                    attachment_context_snippets.append(
                        f"<attachment title='{att.title}' type='{att.type}'>\n{att.content[:1500]}\n</attachment>"
                    )

        # 3. Save User Message
        user_msg = AISessionMessage(
            session_id=session.id,
            sender="user",
            content=clean_content,
            attachments=attachments_data,
            raw_metadata={"mode": req.mode},
        )
        db.add(user_msg)
        db.commit()
        db.refresh(user_msg)

        # 4. Build prompt to send to AGY agent
        prompt_parts = []
        if req.mode == "simplify":
            prompt_parts.append("[Task: Simplify this concept in clear, plain language with key bullet points]")
        elif req.mode == "analogy":
            prompt_parts.append("[Task: Provide an intuitive, memorable real-world analogy for this concept]")
        elif req.mode == "example":
            prompt_parts.append("[Task: Provide a concrete, annotated step-by-step worked code example]")

        if attachment_context_snippets:
            prompt_parts.append("<attached_resources>\n" + "\n".join(attachment_context_snippets) + "\n</attached_resources>")

        prompt_parts.append(f"<student_query>\n{clean_content}\n</student_query>")
        combined_prompt = "\n\n".join(prompt_parts)

        # 5. Execute via AGY CLI
        adapter = AISessionService.get_adapter()
        response_text = None
        source_label = "agy_cli"

        if session.agy_conversation_id:
            baseline_step_count = adapter.get_transcript_step_count(session.agy_conversation_id)
            instruction_prefix = (
                "[Instructions: Answer the user's inquiry directly. Do NOT execute workspace tools or bash commands.]\n\n"
            )
            send_ok = adapter.send_message(
                session.agy_conversation_id,
                instruction_prefix + combined_prompt,
            )
            if send_ok:
                response_text, new_steps = adapter.wait_for_latest_response(
                    session.agy_conversation_id,
                    previous_step_count=baseline_step_count,
                    timeout_seconds=25,
                )

        # If AGY daemon did not return text (e.g. offline/daemon not active), use curriculum-grounded deterministic fallback
        if not response_text:
            source_label = "deterministic_fallback"
            if session.session_type == "question_generation":
                topic_title = session.context_snapshot.get("topic_title", "Topic")
                response_text = (
                    f"### Generated Questions for {topic_title}\n\n"
                    "```json\n"
                    "[\n"
                    "  {\n"
                    f'    "prompt": "What is the primary architectural invariant in {topic_title}?",\n'
                    '    "type": "multiple_choice",\n'
                    '    "difficulty": "medium",\n'
                    '    "points": 2,\n'
                    '    "explanation": "Understanding core invariants guarantees predictable program execution.",\n'
                    '    "sourceContext": "Syllabus foundation",\n'
                    '    "options": [\n'
                    '      { "id": "1", "text": "Deterministic state evaluation", "isCorrect": true },\n'
                    '      { "id": "2", "text": "Arbitrary runtime mutability", "isCorrect": false },\n'
                    '      { "id": "3", "text": "Dynamic unverified pointer shifting", "isCorrect": false },\n'
                    '      { "id": "4", "text": "Unchecked concurrency overrides", "isCorrect": false }\n'
                    '    ],\n'
                    '    "correctBool": true,\n'
                    '    "acceptedAnswers": [],\n'
                    '    "matchingPairs": [],\n'
                    '    "expectedRubric": ""\n'
                    "  }\n"
                    "]\n"
                    "```"
                )
            else:
                lesson_title = session.context_snapshot.get("lesson_title", "Lesson")
                topic_title = session.context_snapshot.get("topic_title", "Topic")
                if req.mode == "diagram":
                    response_text = (
                        f"### 🗺️ Visual Architecture Diagram: {lesson_title}\n\n"
                        "Below is the architectural flow illustrating state transitions and execution flow in this unit:\n\n"
                        "```mermaid\n"
                        "flowchart TD\n"
                        f'    A["Inbound Data State"] --> B["{lesson_title} Contract Check"]\n'
                        '    B --> C{"Preconditions Valid?"}\n'
                        f'    C -->|Yes| D["Core Module: {topic_title}"]\n'
                        '    C -->|No| E["Fault Quarantine"]\n'
                        '    D --> F["Deterministic Target State"]\n'
                        "```\n\n"
                        "#### Architectural Flow:\n"
                        f"- **Contract Check:** Strict verification of prerequisite bounds for {lesson_title}.\n"
                        "- **Core Module:** Side-effect-free execution and state transformation.\n"
                        "- **Target State:** Output safely bound and ready for downstream components."
                    )
                elif req.mode == "analogy":
                    response_text = (
                        f"### 💡 Real-World Analogy: {lesson_title}\n\n"
                        f"Think of **{lesson_title}** like an **automated shipping distribution hub**:\n\n"
                        "```mermaid\n"
                        "flowchart LR\n"
                        '    A["Incoming Packages"] --> B["Barcode Scanner"]\n'
                        '    B --> C["Sorting Belts"]\n'
                        '    C --> D["Delivery Fleet"]\n'
                        "```\n\n"
                        "Incoming packages (data inputs) are inspected against standard barcodes (prerequisites). "
                        "Once verified, each item is sorted into designated conveyor belts (registers) without collisions, "
                        "ensuring every delivery arrives at the exact right address in deterministic order."
                    )
                elif req.mode == "example":
                    response_text = (
                        f"### ⚙️ Worked Example: {lesson_title}\n\n"
                        "```mermaid\n"
                        "sequenceDiagram\n"
                        '    participant Client as Application Logic\n'
                        f'    participant Unit as {lesson_title} Pipeline\n'
                        '    Client->>Unit: process_unit(items)\n'
                        '    Note over Unit: Validate non-empty payload\n'
                        '    Unit->>Unit: Compute deterministic state\n'
                        '    Unit-->>Client: Return immutable result dict\n'
                        "```\n\n"
                        f"Here is a concrete step-by-step implementation demonstrating **{lesson_title}**:\n\n"
                        "```python\n"
                        "# Step 1: Initialize structured inputs\n"
                        "def process_unit(items: list[int]) -> dict[str, int]:\n"
                        "    # Ensure deterministic processing\n"
                        "    processed = [x * 2 for x in items if x > 0]\n"
                        "    return {'count': len(processed), 'total': sum(processed)}\n\n"
                        "# Step 2: Validate execution output\n"
                        "result = process_unit([1, 2, 3, 4])\n"
                        "print(f'Processed result: {result}')\n"
                        "```\n\n"
                        "- **Line 3:** Validates each item to prevent negative side-effects.\n"
                        "- **Line 4:** Calculates aggregation in a single predictable pass."
                    )
                else:
                    response_text = (
                        f"### 🎯 5-Second Mental Model: {lesson_title}\n\n"
                        f"In this unit on **{lesson_title}**, we study how structured invariants ensure system reliability.\n\n"
                        "### 🗺️ Visual Architecture Diagram\n\n"
                        "```mermaid\n"
                        "flowchart TD\n"
                        f'    A["Incoming State"] --> B["{lesson_title} Invariant Validation"]\n'
                        f'    B --> C["Isolated Processing Scope"]\n'
                        '    C --> D["Deterministic Return"]\n'
                        "```\n\n"
                        "#### Core Takeaways to Remember:\n"
                        "- **Predictability:** Consistent data structures prevent runtime errors.\n"
                        "- **Isolation:** Modules operate independently without polluting outer scopes.\n"
                        "- **Verification:** Always validate inputs before committing state mutations.\n\n"
                        f"Feel free to ask any follow-up questions or attach a code sample from the lesson!"
                    )

        # 6. If Question Generation session, extract candidate questions and persist into ai_question_candidates
        extracted_questions = AgyCliAdapter.extract_json_array(response_text)
        saved_candidate_ids = []
        if session.session_type == "question_generation" and extracted_questions:
            topic_id = session.topic_id or session.course_id
            for q_data in extracted_questions:
                try:
                    cand = AICandidateQuestion(
                        course_id=session.course_id,
                        topic_id=topic_id,
                        author_id=actor.id,
                        type=q_data.get("type", "multiple_choice"),
                        difficulty=q_data.get("difficulty", "medium"),
                        points=int(q_data.get("points", 2)),
                        prompt=q_data.get("prompt", "Question"),
                        explanation=q_data.get("explanation", ""),
                        source_context=q_data.get("sourceContext", f"AGY Session: {session.title}"),
                        payload={
                            "options": q_data.get("options", []),
                            "matching_pairs": q_data.get("matchingPairs", []),
                        },
                        answer_key={
                            "correct_bool": q_data.get("correctBool", True),
                            "accepted_answers": q_data.get("acceptedAnswers", []),
                            "expected_rubric": q_data.get("expectedRubric", ""),
                        },
                        status="pending_review",
                        provider=source_label,
                        model="agy-agent",
                        prompt_version="v2",
                    )
                    db.add(cand)
                    db.flush()
                    saved_candidate_ids.append(str(cand.id))
                except Exception as exc:
                    logger.warning("Failed to persist candidate question: %s", exc)

        # Clean any Mermaid pipe quotes to prevent syntax errors
        if response_text and "```mermaid" in response_text:
            import re
            response_text = re.sub(
                r'\|([^|\n]+)\|',
                lambda m: '|' + m.group(1).replace('"', "'") + '|',
                response_text,
            )

        # 7. Save Agent Response Message
        agent_msg = AISessionMessage(
            session_id=session.id,
            sender="agent",
            content=response_text,
            attachments=[],
            raw_metadata={
                "source": source_label,
                "saved_candidate_ids": saved_candidate_ids,
            },
        )
        db.add(agent_msg)
        db.commit()
        db.refresh(agent_msg)

        return user_msg, agent_msg

    @staticmethod
    def get_session_messages(
        db: Session,
        session_id: UUID,
        actor: User,
    ) -> List[AISessionMessage]:
        """Retrieve full message history for an authorized session."""
        session = db.get(AISession, session_id)
        if not session:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="AI session not found")

        if session.user_id != actor.id and actor.role.name not in ("administrator", "teacher"):
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied to session")

        return (
            db.query(AISessionMessage)
            .filter(AISessionMessage.session_id == session.id)
            .order_by(AISessionMessage.created_at.asc())
            .all()
        )
