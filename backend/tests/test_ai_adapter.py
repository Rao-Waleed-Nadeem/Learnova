"""Unit tests for ILLMServiceAdapter, Gemini adapter, and deterministic fallback (P9-01, P9-02, P9-03, P9-06)."""

from unittest.mock import MagicMock, patch
import pytest

from app.ai.adapter import (
    AIGenerateRequest,
    AISimplifyRequest,
    GeminiServiceAdapter,
    ILLMServiceAdapter,
)


def test_adapter_protocol_conformance():
    """Verify GeminiServiceAdapter implements ILLMServiceAdapter protocol."""
    adapter = GeminiServiceAdapter(api_key=None)
    assert isinstance(adapter, ILLMServiceAdapter)


def test_deterministic_fallback_when_api_key_missing():
    """P9-02: When GEMINI_API_KEY is missing, adapter safely returns deterministic educational content."""
    adapter = GeminiServiceAdapter(api_key=None)

    # 1. Lesson tutoring fallback
    req_simp = AISimplifyRequest(
        course_title="Algorithms",
        topic_title="Sorting",
        lesson_title="Merge Sort",
        lesson_content="Divide and conquer algorithm with O(n log n) complexity.",
        mode="analogy",
    )
    res_simp = adapter.simplify_lesson(req_simp)
    assert res_simp.source == "deterministic_fallback"
    assert "Merge Sort" in res_simp.explanation
    assert "postal sorting" in res_simp.explanation.lower()

    # 2. Question generation fallback
    req_gen = AIGenerateRequest(
        course_title="Algorithms",
        topic_title="Sorting",
        source_content="Merge sort divides arrays into sub-arrays.",
        question_types=["multiple_choice", "true_false", "fill_blank", "matching", "short_answer"],
        difficulty="medium",
        count=5,
    )
    res_gen = adapter.generate_questions(req_gen)
    assert res_gen.source == "deterministic_fallback"
    assert len(res_gen.candidates) == 5

    types = [c.type for c in res_gen.candidates]
    assert "multiple_choice" in types
    assert "true_false" in types
    assert "fill_blank" in types
    assert "matching" in types
    assert "short_answer" in types


def test_normalize_candidates_validates_and_decomposes_5_types():
    """P9-06: Raw candidate JSON is normalized and decomposed into payload and answer_key for all 5 question types."""
    adapter = GeminiServiceAdapter(api_key="mock-key")

    raw_candidates = [
        {
            "prompt": "What is Python?",
            "type": "multiple_choice",
            "difficulty": "easy",
            "points": 1,
            "explanation": "Python is an interpreted language.",
            "sourceContext": "Intro",
            "options": [
                {"id": "1", "text": "Interpreted language", "isCorrect": True},
                {"id": "2", "text": "Hardware CPU", "isCorrect": False},
            ],
        },
        {
            "prompt": "Merge sort runs in O(N log N) time.",
            "type": "true_false",
            "difficulty": "medium",
            "points": 1,
            "correctBool": True,
        },
        {
            "prompt": "The primary memory is called [blank].",
            "type": "fill_blank",
            "difficulty": "medium",
            "points": 2,
            "acceptedAnswers": ["RAM", "Random Access Memory"],
        },
        {
            "prompt": "Match the data structures:",
            "type": "matching",
            "difficulty": "hard",
            "points": 4,
            "matchingPairs": [
                {"id": "p1", "left": "Stack", "right": "LIFO"},
                {"id": "p2", "left": "Queue", "right": "FIFO"},
            ],
        },
        {
            "prompt": "Explain the halting problem.",
            "type": "short_answer",
            "difficulty": "hard",
            "points": 3,
            "expectedRubric": "Must mention undecidability and Turing machines.",
        },
    ]

    normalized = adapter._normalize_candidates(raw_candidates, fallback_diff="medium")
    assert len(normalized) == 5

    mcq = normalized[0]
    assert mcq.type == "multiple_choice"
    assert mcq.payload["options"][0]["text"] == "Interpreted language"
    assert mcq.answer_key["correct_option_ids"] == ["1"]

    tf = normalized[1]
    assert tf.type == "true_false"
    assert tf.answer_key["correct_bool"] is True

    fb = normalized[2]
    assert fb.type == "fill_blank"
    assert "RAM" in fb.answer_key["accepted_answers"]

    mat = normalized[3]
    assert mat.type == "matching"
    assert mat.answer_key["pairs"]["Stack"] == "LIFO"

    sa = normalized[4]
    assert sa.type == "short_answer"
    assert sa.answer_key["grading_mode"] == "manual_review"


def test_adapter_handles_timeout_and_network_failure():
    """P9-03: Provider network timeout or error triggers fallback gracefully without raising uncaught exception."""
    adapter = GeminiServiceAdapter(api_key="mock-key", timeout_seconds=1, max_retries=0)

    with patch("httpx.Client.post", side_effect=Exception("Connection timed out")):
        res_simp = adapter.simplify_lesson(
            AISimplifyRequest("Course", "Topic", "Lesson", "Content")
        )
        assert res_simp.source == "deterministic_fallback"

        res_gen = adapter.generate_questions(
            AIGenerateRequest("Course", "Topic", "Content")
        )
        assert res_gen.source == "deterministic_fallback"
        assert len(res_gen.candidates) >= 1
