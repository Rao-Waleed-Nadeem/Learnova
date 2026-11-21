"""AI service abstraction package for Learnova."""

from app.ai.adapter import (
    AIGenerateRequest,
    AIGenerateResult,
    AISimplifyRequest,
    AISimplifyResult,
    AgyServiceAdapter,
    CandidateQuestionDraft,
    GeminiServiceAdapter,
    ILLMServiceAdapter,
)

__all__ = [
    "ILLMServiceAdapter",
    "AgyServiceAdapter",
    "GeminiServiceAdapter",
    "AISimplifyRequest",
    "AISimplifyResult",
    "AIGenerateRequest",
    "AIGenerateResult",
    "CandidateQuestionDraft",
]
