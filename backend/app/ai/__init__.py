"""AI service abstraction package for Learnova."""

from app.ai.adapter import (
    AIGenerateRequest,
    AIGenerateResult,
    AISimplifyRequest,
    AISimplifyResult,
    CandidateQuestionDraft,
    GeminiServiceAdapter,
    ILLMServiceAdapter,
)

__all__ = [
    "ILLMServiceAdapter",
    "GeminiServiceAdapter",
    "AISimplifyRequest",
    "AISimplifyResult",
    "AIGenerateRequest",
    "AIGenerateResult",
    "CandidateQuestionDraft",
]
